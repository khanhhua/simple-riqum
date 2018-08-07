import debug from 'debug';
import amqp from 'amqplib';

const dbg = debug('simple-riqum:resource-deployer');

const AMQP_USERNAME = process.env.AMQP_USERNAME;
const AMQP_PASSWORD = process.env.AMQP_PASSWORD;

const AMQP_URL = process.env.AMQP_URL || `amqp://${AMQP_USERNAME}:${AMQP_PASSWORD}@localhost/`;
const DEPLOYER_TASK_Q = process.env.DEPLOYER_TASK_Q || 'deployments';
// let client;
let channel;

export async function makeChannel() {
  dbg('Establishing rabbit channel...');
  channel = await amqp.connect(AMQP_URL).then(conn => {
    return conn.createChannel();
  });

  const result = await channel.assertQueue(DEPLOYER_TASK_Q);
  if (result && result.queue === DEPLOYER_TASK_Q) {
    dbg(`Task queue ${DEPLOYER_TASK_Q} is ready`);
    return true;
  } else {
    dbg(`WARN: Task queue ${DEPLOYER_TASK_Q} is not ready`);

    return false;
  }
}

export async function deployResource({ id, name }) {
  if (!channel) {
    throw new Error('AMQP Channel not ready. Did you call "makeChannel"???');
  }

  dbg(`Publishing a task into queue ${DEPLOYER_TASK_Q}`);
  const payload = Buffer.from(JSON.stringify({
    resource: { id, name },
    config: {
      platform: 'google-appengine'
    }
  }));
  await channel.publish('', DEPLOYER_TASK_Q, payload);
  console.log(`Deployment for resource id=${id} has been enqueued`);

  return true;
}
