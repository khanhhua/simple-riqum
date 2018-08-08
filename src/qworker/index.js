import debug from 'debug';
import amqp from 'amqplib';
import shell from 'shelljs';
import Hashids from 'hashids';

import { initDb } from '../db';
import { Resource } from '../models';

const dbg = debug('simple-riqum:qworker');

const AMQP_USERNAME = process.env.AMQP_USERNAME;
const AMQP_PASSWORD = process.env.AMQP_PASSWORD;

const AMQP_URL = process.env.AMQP_URL || `amqp://${AMQP_USERNAME}:${AMQP_PASSWORD}@localhost/`;
const DEPLOYER_TASK_Q = process.env.DEPLOYER_TASK_Q || 'deployments';

const DEPLOYMENT_SCRIPTS_DIR = process.env.DEPLOYMENT_SCRIPTS_DIR;

const hashids = new Hashids();
// If this is the main script....
let channel;
if (require.main === module) {
  Object.entries(process.env).forEach(([k, v]) => k.toUpperCase()===k && dbg(`${k}=${v}`));

  amqp.connect(AMQP_URL).then(async (conn) => {
    await initDb().then(() => { dbg('Database configuration done'); });

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
}

export async function consumer(msg) {
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

export async function deploy(payload) {
  if (!('resource' in payload)) {
    throw new Error('Bad deployment payload. Missing "resource"');
  }
  if (!('config' in payload)) {
    throw new Error('Bad deployment payload. Missing "config"');
  }

  if (payload.config.platform === 'google-appengine') {
    // Refer to Google Cloud API documentation
    // https://cloud.google.com/kubernetes-engine/docs/reference/rest/v1/projects.zones.clusters/create

    // Refer to Google Cloud API documentation
    /*
    App Engine Flexible Environment
    Deploying to App Engine

    You can deploy an image hosted by Container Registry to App Engine using the gcloud command-line tool.

    You can use the gcloud beta app gen-config command in your image's root directory to automatically create the app.yaml file needed to deploy to App Engine. Alternatively, you can write the file yourself.

    Once you have created the App Engine configuration file, built your Docker image, and pushed your image to Container Registry , you can deploy your image to App Engine by running the following command:

    gcloud app deploy --image-url=[HOSTNAME]/[PROJECT-ID]/[IMAGE]:[TAG]
    where:

    [HOSTNAME] is listed under Location in the console. It's one of four options: gcr.io, us.gcr.io, eu.gcr.io, or asia.gcr.io.
    [PROJECT-ID] is your Google Cloud Platform Console project ID. See Domain-scoped projects for how to work with projects IDs that include a domain.
    [IMAGE] is the image's name in Container Registry.
    [TAG] is the tag that identifies the version of the image in Container Registry. If you do not specify a tag, Container Registry will look for the default tag latest.
    Was this page helpful? Let us know how we did:
    */

    const { resource: { id: resourceId } } = payload;
    const shortResourceId = hashids.encode(resourceId.replace(/[^\d]/g, '')).toLowerCase();

    shell.echo('Executing shell from working directory ' + process.cwd());
    shell.cd(DEPLOYMENT_SCRIPTS_DIR);
    shell.exec(`bash gcloud-app-deploy.sh ${shortResourceId}`);

    try {
      await Resource.update({ status: 'started', uri: `https://${shortResourceId}-dot-simple-riqum.appspot.com` }, { where: { id: resourceId }});
      console.log('Updated resource data')
    } catch (e) {
      dbg('Error during resource data update');
      console.log(e.message);
    }

  }
}
