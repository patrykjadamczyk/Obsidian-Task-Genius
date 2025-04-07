/** @hidden */
declare module "TaskIndexWorker" {
    const WorkerFactory: new () => Worker;
    export default WorkerFactory;
}