const cluster = require('cluster');
const numOfClusters = Number(process.env.NUM_OF_CLUSTERS);
const { setupPrimary } = require('@socket.io/cluster-adapter');

if (cluster.isMaster) {
  // setup connections between the workers
  setupPrimary();

  // needed for packets containing buffers (you can ignore it if you only send plaintext objects)
  cluster.setupMaster({
    serialization: 'advanced',
  });

  // Fork workers.
  for (let i = 0; i < numOfClusters; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    // cluster.fork();
  });
} else {
  require('./server'); // Run App Server
}
