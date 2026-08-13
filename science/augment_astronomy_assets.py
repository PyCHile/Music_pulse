#!/usr/bin/env python3
"""Augment URUX astronomy assets with ESO archive metadata and NIST visible lines.

This runs in GitHub Actions after the primary Astropy/Astroquery pipeline. All
remote failures are recorded; no measurements are fabricated.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import astropy.units as u
from astroquery.eso import Eso
from astroquery.nist import Nist

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'runtime'/'assets'/'astronomy'
MANIFEST=OUT/'manifest.json'
TARGET=os.getenv('URUX_ASTRONOMY_TARGET','M 42')


def simple(v):
    try:
        if hasattr(v,'mask') and bool(v.mask): return None
    except Exception: pass
    try:
        if hasattr(v,'value'): return float(v.value)
    except Exception: pass
    if isinstance(v,(str,int,float,bool)) or v is None:return v
    return str(v)


def save(name,payload):
    p=OUT/name;p.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8');return p


def augment_eso(manifest):
    try:
        eso=Eso();eso.ROW_LIMIT=64
        instruments=eso.list_instruments(cache=False)
        records=[]
        clean_target=TARGET.replace("'","").strip()
        try:
            table=eso.query_instrument('muse',column_filters={'target':f"like '%{clean_target}%'"},columns=['dp_id','target','ra','dec','exp_start'],cache=False)
            if table is not None:
                cols=[c for c in ['dp_id','target','ra','dec','exp_start'] if c in table.colnames]
                records=[{c:simple(row[c]) for c in cols} for row in table[:64]]
        except Exception as query_error:
            manifest.setdefault('errors',{})['astroquery.eso.query']={'type':query_error.__class__.__name__,'message':str(query_error)}
        payload={'source':'ESO Science Archive via astroquery.eso','queriedAt':datetime.now(timezone.utc).isoformat(),'target':TARGET,'instrumentProbe':'muse','availableInstruments':list(instruments or []),'records':records}
        save('eso-archive.json',payload)
        manifest.setdefault('files',{})['eso-archive.json']='runtime/assets/astronomy/eso-archive.json'
        manifest.setdefault('capabilities',{})['astroquery.eso']=True
        manifest.setdefault('provenance',[]).append('ESO Science Archive')
    except Exception as exc:
        manifest.setdefault('capabilities',{})['astroquery.eso']=False
        manifest.setdefault('errors',{})['astroquery.eso']={'type':exc.__class__.__name__,'message':str(exc)}


def augment_nist(manifest):
    try:
        table=Nist.query(400*u.nm,700*u.nm,linename=['H I','O III','N II','S II'],output_order='wavelength',wavelength_type='vacuum')
        observed='Observed' if 'Observed' in table.colnames else None
        ritz='Ritz' if 'Ritz' in table.colnames else None
        rel='Rel.' if 'Rel.' in table.colnames else None
        lines=[]
        for row in table[:512]:
            wavelength=None
            for key in (observed,ritz):
                if key:
                    try:
                        val=row[key]
                        if hasattr(val,'mask') and bool(val.mask):continue
                        wavelength=float(val)
                        break
                    except Exception: pass
            if wavelength is None:continue
            lines.append({'wavelengthNm':wavelength,'relativeIntensity':simple(row[rel]) if rel else None,'spectrum':simple(row['Spectrum']) if 'Spectrum' in table.colnames else None,'transition':simple(row['Transition']) if 'Transition' in table.colnames else None})
        save('nist-visible-emission-lines.json',{'source':'NIST Atomic Spectra Database via astroquery.nist','queriedAt':datetime.now(timezone.utc).isoformat(),'rangeNm':[400,700],'species':['H I','O III','N II','S II'],'records':lines})
        manifest.setdefault('files',{})['nist-visible-emission-lines.json']='runtime/assets/astronomy/nist-visible-emission-lines.json'
        manifest.setdefault('capabilities',{})['astroquery.nist']=bool(lines)
        manifest.setdefault('capabilities',{})['truecolor.spectralSource']=bool(lines)
        manifest.setdefault('provenance',[]).append('NIST Atomic Spectra Database')
    except Exception as exc:
        manifest.setdefault('capabilities',{})['astroquery.nist']=False
        manifest.setdefault('capabilities',{})['truecolor.spectralSource']=False
        manifest.setdefault('errors',{})['astroquery.nist']={'type':exc.__class__.__name__,'message':str(exc)}


def main():
    manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
    augment_eso(manifest);augment_nist(manifest)
    manifest['augmentedAt']=datetime.now(timezone.utc).isoformat()
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'eso':manifest.get('capabilities',{}).get('astroquery.eso'),'nist':manifest.get('capabilities',{}).get('astroquery.nist')},indent=2))

if __name__=='__main__':main()
