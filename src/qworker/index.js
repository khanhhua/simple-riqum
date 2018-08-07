import debug from 'debug';
import amqp from 'amqplib';

const dbg = debug('simple-riqum:qworker');

const AMQP_USERNAME = process.env.AMQP_USERNAME;
const AMQP_PASSWORD = process.env.AMQP_PASSWORD;

const AMQP_URL = process.env.AMQP_URL || `amqp://${AMQP_USERNAME}:${AMQP_PASSWORD}@localhost/`;
const DEPLOYER_TASK_Q = process.env.DEPLOYER_TASK_Q || 'deployments';

let channel;

amqp.connect(AMQP_URL).then(async (conn) => {
  dbg(`Establishing rabbit channel to ${AMQP_URL}`);
  channel = await conn.createChannel();

  const result = await channel.assertQueue(DEPLOYER_TASK_Q);
  if (!result || result.queue !== DEPLOYER_TASK_Q) {
    dbg('Could not establish queue. Exiting...');
    return;
  }

  console.log('Queue has been established. Consuming...');

  channel.consume(DEPLOYER_TASK_Q, consumer, { noAck: false });
});

async function consumer(msg) {
  if (!channel) {
    throw new Error('Channel not ready');
  }
  const contentString = msg.content.toString();

  dbg('Message received');
  dbg('Message fields:', msg.fields);
  dbg('Message content:', contentString);

  try {
    const payload = JSON.parse(contentString);
    await deploy(payload);

    channel.ack(msg);
    dbg('Message has been processed');
  } catch (e) {
    if (e instanceof SyntaxError) {
      channel.ack(msg);
      console.log('Bad message has been consumed dropped');
    } else {
      console.error(e.message);
      channel.nack(msg);
      dbg('Message failed to be processed');
    }
  }
}

async function deploy(payload) {
  return new Promise(resolve => {
    dbg('Deploying payload', payload);

    setTimeout(resolve, 4000);
  });
}
