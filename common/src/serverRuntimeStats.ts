// common/src/serverRuntimeStats.ts

export type ServerRuntimeStatsSnapshot = {
  timestamp: number;
  memoryRssMb: number;
  memoryHeapUsedMb: number;
  memoryHeapTotalMb: number;
  systemMemoryUsedMb: number;
  systemMemoryTotalMb: number;
  systemMemoryUsedPercent: number;
  processCpuPercent: number | null;
  systemLoadPercent: number | null;
  cpuCount: number;
  uptimeSec: number;
  wsRxKbps: number;
  wsTxKbps: number;
  wsRxBytesTotal: number;
  wsTxBytesTotal: number;
};
