declare module 'node-machine-id' {
  export function machineIdSync(original?: boolean): string
  export function machineId(original?: boolean): Promise<string>
  const nodeMachineId: { machineIdSync: typeof machineIdSync; machineId: typeof machineId }
  export default nodeMachineId
}
