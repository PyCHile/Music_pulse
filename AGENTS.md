# AGENTS.md — URUX

## Propósito
URUX implementa un Journey Director narrativo sobre Three.js con decisiones de dramaturgia generadas por LLM.

## Arquitectura
URUXJourneyAgent → OpenRouterModelResolver → NarrativeStateMachine → EncounterPlanner → FocalTrajectoryEngine → CosmicPaletteDirector → Three.js

## Estados narrativos
DESPRENDIMIENTO → TUNEL → LUZ → MEMORIA → FRONTERA → RETORNO

## Convenciones
- Las llamadas LLM se hacen en batch cada 20–60s, no por frame.
- El buffer de encuentros se almacena en memoria del navegador.
- El modelo OpenRouter se selecciona determinísticamente con SHA-256.
- Respuestas LLM: JSON estricto sin texto adicional.

## Restricciones
- No modificar la secuencia de estados narrativos sin actualizar NarrativeStateMachine.
- No agregar llamadas LLM síncronas en el render loop de Three.js.
- Nunca exponer una API key de OpenRouter en el repositorio o en el bundle público.
- Si OpenRouter no está configurado o falla, mantener el modo autónomo procedural.
