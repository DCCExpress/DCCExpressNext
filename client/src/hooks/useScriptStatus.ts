import { useEffect, useState } from "react";
import {
  scriptEngine,
  type ScriptSession,
  type ScriptState,
} from "../services/scriptEngine";

export function useScriptStatus() {
  const [scriptSession, setScriptSession] = useState<ScriptSession | null>(
    scriptEngine.getCurrentSession()
  );

  const [scriptState, setScriptState] = useState<ScriptState | null>(
    scriptEngine.getCurrentSession()?.getState() ?? null
  );

  useEffect(() => {
    return scriptEngine.subscribe(session => {
      setScriptSession(session);
      setScriptState(session?.getState() ?? null);
    });
  }, []);

  useEffect(() => {
    if (!scriptSession) return;

    return scriptSession.subscribe(state => {
      setScriptState(state);
    });
  }, [scriptSession]);

  return {
    scriptSession,
    scriptState,
    stopScript: () => scriptEngine.stopCurrent(),
  };
}