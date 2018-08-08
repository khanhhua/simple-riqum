import chai, { expect } from 'chai';
import spies from 'chai-spies';

import * as qworker from "./index";
import { __RewireAPI__ as rewireAPI } from './index';

chai.use(spies);

describe('QWorker', () => {
  it('must have a nice interface', () => {
    expect(qworker.consumer).to.be.a('function');
    expect(qworker.deploy).to.be.a('function');
  });

  describe('Consumer', () => {
    let channel = {};

    const sandbox = chai.spy.sandbox();
    let deploy;

    beforeEach(() => {
      sandbox.on(channel, ['ack', 'nack']);
      rewireAPI.__Rewire__('channel', channel);
    });
    afterEach(() => {
      rewireAPI.__ResetDependency__('deploy');
      rewireAPI.__ResetDependency__('channel');
      sandbox.restore();
    });

    it('must force consume and drop malform JSON message', async () => {
      deploy = chai.spy(() => Promise.resolve());
      rewireAPI.__Rewire__('deploy', deploy);
      await qworker.consumer({
        fields: {},
        content: Buffer.from('bad json of course')
      });

      expect(deploy).to.not.have.been.called.once;
      expect(channel.ack).to.have.been.called.once;
    });

    it('must consume a good JSON payload', async () => {
      deploy = chai.spy(() => Promise.resolve());
      rewireAPI.__Rewire__('deploy', deploy);
      await qworker.consumer({
        fields: {},
        content: Buffer.from('{"resource": {"id":"uuid4-123456789","name":"abc"}, "config": {}}')
      });

      expect(deploy).to.have.been.called.once;
      expect(channel.ack).to.have.been.called.once;
    });

    it('must nack if deployment fails', async () => {
      deploy = chai.spy(() => Promise.reject(new Error('Mock error')));
      rewireAPI.__Rewire__('deploy', deploy);
      await qworker.consumer({
        fields: {},
        content: Buffer.from('{"resource": {"id":"uuid4-123456789","name":"abc"}, "config": {}}')
      });

      expect(deploy).to.have.been.called.once;
      expect(channel.nack).to.have.been.called.once;
    });
  })

  describe('Deploy', () => {
    it('must validate deployment config', async () => {
      try {
        await qworker.deploy({});
        expect.fail();
      } catch (e) {
        expect(e).to.be.an('error');
        expect(e.message).to.be.equal('Bad deployment payload. Missing "resource"');
      }

      try {
        await qworker.deploy({resource: { id: 'uuidv4-123', name: 'tom' }});
        expect.fail();
      } catch (e) {
        expect(e).to.be.an('error');
        expect(e.message).to.be.equal('Bad deployment payload. Missing "config"');
      }
    });

    it('must deploy resource Google Kubernetes', async () => {

    });
  });
});
