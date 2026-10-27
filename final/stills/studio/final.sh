#!/bin/sh
SC="C:/Users/joung/AppData/Local/Temp/claude/C--Users-joung-------/459c3502-71df-4eac-810f-eaac68dcd55f/scratchpad/studio"
cd "$SC/scripts"
for scene in "$@"; do
  sh "C:/Users/joung/AppData/Local/Temp/claude/C--Users-joung-------/459c3502-71df-4eac-810f-eaac68dcd55f/scratchpad/scripts/blender.sh" --python scene_$scene.py -- samples=160 ssamples=96 > "$SC/out/$scene-final.log" 2>&1
  grep -E "RENDERED|CAMFIT|PROBES|Error|Traceback" "$SC/out/$scene-final.log"
done
echo ALLDONE
