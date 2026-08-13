#include <celastro/astro.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <algorithm>
#include <cerrno>
#include <cmath>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <optional>
#include <regex>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <unordered_map>

using namespace celestia;

namespace {
constexpr const char* VERSION="1.1.0";
constexpr std::size_t MAX_REQUEST_BYTES=64*1024;
struct Request{std::string method,path,body;std::unordered_map<std::string,std::string> headers;};

std::string lower(std::string v){std::transform(v.begin(),v.end(),v.begin(),[](unsigned char c){return static_cast<char>(std::tolower(c));});return v;}
std::string trim(std::string v){auto b=v.find_first_not_of(" \t\r\n");if(b==std::string::npos)return{};auto e=v.find_last_not_of(" \t\r\n");return v.substr(b,e-b+1);}
bool ctEqual(const std::string&a,const std::string&b){if(a.size()!=b.size())return false;unsigned char d=0;for(std::size_t i=0;i<a.size();++i)d|=static_cast<unsigned char>(a[i]^b[i]);return d==0;}
std::string escape(const std::string&s){std::ostringstream o;for(char c:s){switch(c){case '\\':o<<"\\\\";break;case '"':o<<"\\\"";break;case '\n':o<<"\\n";break;case '\r':o<<"\\r";break;case '\t':o<<"\\t";break;default:o<<c;}}return o.str();}

std::optional<double> jsonNumber(const std::string&body,const std::string&key){
  std::regex p("\\\""+key+"\\\"\\s*:\\s*(-?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?)");std::smatch m;
  if(!std::regex_search(body,m,p)||m.size()<2)return std::nullopt;try{double v=std::stod(m[1].str());if(std::isfinite(v))return v;}catch(...){}return std::nullopt;
}

Request readRequest(int fd){
  std::string raw;raw.reserve(8192);char buf[4096];std::size_t headerEnd=std::string::npos,contentLength=0;
  while(raw.size()<MAX_REQUEST_BYTES){
    ssize_t n=::recv(fd,buf,sizeof(buf),0);if(n<=0)break;raw.append(buf,static_cast<std::size_t>(n));
    if(headerEnd==std::string::npos){
      headerEnd=raw.find("\r\n\r\n");
      if(headerEnd!=std::string::npos){
        std::istringstream hs(raw.substr(0,headerEnd));std::string line;std::getline(hs,line);
        while(std::getline(hs,line)){if(!line.empty()&&line.back()=='\r')line.pop_back();auto c=line.find(':');if(c==std::string::npos)continue;auto name=lower(trim(line.substr(0,c))),value=trim(line.substr(c+1));if(name=="content-length"){try{contentLength=static_cast<std::size_t>(std::stoull(value));}catch(...){throw std::runtime_error("invalid_content_length");}}}
        if(contentLength>MAX_REQUEST_BYTES)throw std::runtime_error("request_too_large");
      }
    }
    if(headerEnd!=std::string::npos&&raw.size()>=headerEnd+4+contentLength)break;
  }
  if(headerEnd==std::string::npos)throw std::runtime_error("invalid_http_request");
  Request r;std::istringstream s(raw.substr(0,headerEnd));std::string line,version;if(!std::getline(s,line))throw std::runtime_error("missing_request_line");if(!line.empty()&&line.back()=='\r')line.pop_back();{std::istringstream f(line);f>>r.method>>r.path>>version;if(r.method.empty()||r.path.empty())throw std::runtime_error("invalid_request_line");}
  while(std::getline(s,line)){if(!line.empty()&&line.back()=='\r')line.pop_back();auto c=line.find(':');if(c!=std::string::npos)r.headers[lower(trim(line.substr(0,c)))]=trim(line.substr(c+1));}
  r.body=raw.substr(headerEnd+4,contentLength);return r;
}

void respond(int fd,int status,const std::string&body){const char*reason=status==200?"OK":status==400?"Bad Request":status==401?"Unauthorized":status==404?"Not Found":status==405?"Method Not Allowed":status==413?"Payload Too Large":"Internal Server Error";std::ostringstream o;o<<"HTTP/1.1 "<<status<<' '<<reason<<"\r\nContent-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\nContent-Length: "<<body.size()<<"\r\n\r\n"<<body;std::string out=o.str();std::size_t sent=0;while(sent<out.size()){ssize_t n=::send(fd,out.data()+sent,out.size()-sent,MSG_NOSIGNAL);if(n<=0)break;sent+=static_cast<std::size_t>(n);}}
bool authorized(const Request&r,const std::string&secret){auto it=r.headers.find("authorization");return !secret.empty()&&it!=r.headers.end()&&ctEqual(it->second,"Bearer "+secret);}

std::string capabilities(){return "{\"ok\":true,\"native\":true,\"engine\":\"Celestia 1.7.0\",\"sidecarVersion\":\"1.1.0\",\"linkedLibrary\":\"libcelestia\",\"modules\":[\"celastro\",\"celengine\",\"celephem\",\"celimage\",\"celmath\",\"celmodel\",\"celrender\",\"celscript\",\"celutil\"],\"nativeFunctions\":[\"magToIrradiance\",\"equatorialToCelestialCart\",\"anomaly\",\"meanEclipticObliquity\"],\"renderLoopDependency\":false}";}
std::string constants(){std::ostringstream o;o<<std::setprecision(15)<<"{\"engine\":\"Celestia\",\"version\":\"1.7.0\",\"native\":true,\"j2000ObliquityDeg\":"<<astro::J2000Obliquity<<",\"speedOfLightKmS\":"<<astro::speedOfLight<<",\"solarMassKg\":"<<astro::SolarMass<<",\"earthMassKg\":"<<astro::EarthMass<<",\"lunarMassKg\":"<<astro::LunarMass<<",\"jupiterMassKg\":"<<astro::JupiterMass<<",\"solarTemperatureK\":"<<astro::SOLAR_TEMPERATURE<<",\"solarIrradianceWM2\":"<<astro::SOLAR_IRRADIANCE<<",\"earthRadiusKm\":"<<astro::EARTH_RADIUS<double><<",\"jupiterRadiusKm\":"<<astro::JUPITER_RADIUS<double><<",\"solarRadiusKm\":"<<astro::SOLAR_RADIUS<double><<'}';return o.str();}

std::pair<int,std::string> route(const Request&r,const std::string&secret){
  if(r.path=="/health"&&r.method=="GET")return{200,"{\"ok\":true,\"service\":\"urux-celestia-sidecar\",\"version\":\"1.1.0\",\"native\":true}"};
  if(!authorized(r,secret))return{401,"{\"ok\":false,\"error\":\"unauthorized\"}"};
  if(r.path=="/v1/capabilities"&&r.method=="GET")return{200,capabilities()};
  if(r.path=="/v1/constants"&&r.method=="GET")return{200,constants()};
  if(r.path=="/v1/photometry"&&r.method=="POST"){auto m=jsonNumber(r.body,"magnitude");if(!m)return{400,"{\"ok\":false,\"error\":\"magnitude_required\"}"};std::ostringstream o;o<<std::setprecision(15)<<"{\"ok\":true,\"magnitude\":"<<*m<<",\"irradiance\":"<<astro::magToIrradiance(static_cast<float>(*m))<<'}';return{200,o.str()};}
  if(r.path=="/v1/equatorial"&&r.method=="POST"){auto ra=jsonNumber(r.body,"raHours"),dec=jsonNumber(r.body,"decDeg"),dist=jsonNumber(r.body,"distance");if(!ra||!dec||!dist)return{400,"{\"ok\":false,\"error\":\"raHours_decDeg_distance_required\"}"};auto p=astro::equatorialToCelestialCart(*ra,*dec,*dist);std::ostringstream o;o<<std::setprecision(15)<<"{\"ok\":true,\"raHours\":"<<*ra<<",\"decDeg\":"<<*dec<<",\"distance\":"<<*dist<<",\"celestial\":["<<p.x()<<','<<p.y()<<','<<p.z()<<"]}";return{200,o.str()};}
  if(r.path=="/v1/anomaly"&&r.method=="POST"){auto mean=jsonNumber(r.body,"meanAnomalyRad"),ecc=jsonNumber(r.body,"eccentricity");if(!mean||!ecc||*ecc<0||*ecc>=1)return{400,"{\"ok\":false,\"error\":\"valid_meanAnomalyRad_and_eccentricity_required\"}"};double ta=0,ea=0;astro::anomaly(*mean,*ecc,ta,ea);std::ostringstream o;o<<std::setprecision(15)<<"{\"ok\":true,\"meanAnomalyRad\":"<<*mean<<",\"eccentricity\":"<<*ecc<<",\"trueAnomalyRad\":"<<ta<<",\"eccentricAnomalyRad\":"<<ea<<'}';return{200,o.str()};}
  if(r.path=="/v1/obliquity"&&r.method=="POST"){auto jd=jsonNumber(r.body,"julianDate");if(!jd)return{400,"{\"ok\":false,\"error\":\"julianDate_required\"}"};std::ostringstream o;o<<std::setprecision(15)<<"{\"ok\":true,\"julianDate\":"<<*jd<<",\"meanEclipticObliquityRad\":"<<astro::meanEclipticObliquity(*jd)<<'}';return{200,o.str()};}
  if(r.path.rfind("/v1/",0)==0&&r.method!="GET"&&r.method!="POST")return{405,"{\"ok\":false,\"error\":\"method_not_allowed\"}"};return{404,"{\"ok\":false,\"error\":\"not_found\"}"};
}
void handle(int fd,const std::string&secret){try{auto r=readRequest(fd);auto [s,b]=route(r,secret);respond(fd,s,b);}catch(const std::exception&e){std::string m=e.what();respond(fd,m=="request_too_large"?413:400,"{\"ok\":false,\"error\":\""+escape(m)+"\"}");}::close(fd);}
}

int main(){const char*t=std::getenv("URUX_SIDECAR_TOKEN");std::string secret=t?t:"";if(secret.size()<24){std::cerr<<"URUX_SIDECAR_TOKEN must contain at least 24 characters\n";return 2;}const char*p=std::getenv("PORT");int port=p?std::atoi(p):8788;if(port<=0||port>65535)return 2;int server=::socket(AF_INET,SOCK_STREAM,0);if(server<0)return 3;int reuse=1;::setsockopt(server,SOL_SOCKET,SO_REUSEADDR,&reuse,sizeof(reuse));sockaddr_in a{};a.sin_family=AF_INET;a.sin_addr.s_addr=htonl(INADDR_ANY);a.sin_port=htons(static_cast<uint16_t>(port));if(::bind(server,reinterpret_cast<sockaddr*>(&a),sizeof(a))<0)return 4;if(::listen(server,128)<0)return 5;std::cout<<"URUX Celestia native sidecar "<<VERSION<<" listening on 0.0.0.0:"<<port<<std::endl;while(true){sockaddr_in c{};socklen_t l=sizeof(c);int fd=::accept(server,reinterpret_cast<sockaddr*>(&c),&l);if(fd<0){if(errno==EINTR)continue;continue;}std::thread(handle,fd,std::cref(secret)).detach();}}
