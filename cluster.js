const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const numOfClusters = Number(process.env.NUM_OF_CLUSTERS);

if (cluster.isMaster) {
  // Fork workers.
  for (let i = 0; i < numOfClusters; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    // cluster.fork();
  });
} else {
  /**
   * Run App
   */
  require('./app');
}
