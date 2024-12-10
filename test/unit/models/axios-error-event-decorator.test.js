const axios = require('axios');
const nock = require('nock');

const AxiosErrorDecorator = require('../../../lib/models/axios-error-event-decorator');

describe(AxiosErrorDecorator, () => {
  const buildEvent = () => ({ extra: {}, tags: {} });
  const buildHint = (error) => ({ originalException: error });

  describe('GET 403', () => {
    let event;
    let hint;

    beforeEach(async () => {
      nock('https://www.example.com').get('/foo/bar').reply(403, null, { 'X-Request-Id': 'abcdef' });
      const error = await axios.get('https://www.example.com/foo/bar').catch((error) => Promise.resolve(error));
      event = buildEvent();
      hint = buildHint(error);
    });

    it('adds response data', async () => {
      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.extra.response).toEqual({
        status: 403,
        headers: { 'x-request-id': 'abcdef' },
      });
    });

    it('adds request data', () => {
      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.extra.request).toEqual({
        // NOTE: There is a bug in nock that causes the method to be undefined.
        //       This isn't the case outside of tests. The bug is fixed in nock 11,
        //       unfortunately, upgrading to it breaks a number of tests. We should
        //       update it soon, but for now, leaving this in the test.
        method: undefined,
        path: '/foo/bar',
        host: 'www.example.com',
        headers: { accept: 'application/json, text/plain, */*', host: 'www.example.com', 'user-agent': 'axios/0.21.1' },
      });
    });

    it('uses path and status for grouping', () => {
      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.fingerprint).toEqual([
        '{{ default }}',
        403,
        'undefined /foo/bar', // NOTE: There is a bug in nock that causes the method to be undefined.
      ]);
    });
  });

  describe('GET 403', () => {
    let event;
    let hint;

    beforeEach(async () => {
      nock('https://www.example.com').get('/foo/bar?hi=hello').reply(403, null, { 'X-Request-Id': 'abcdef' });
      const error = await axios.get('https://www.example.com/foo/bar', { params: { hi: 'hello' } }).catch((error) => Promise.resolve(error));

      event = buildEvent();
      hint = buildHint(error);
    });

    it('excludes query string from grouping', () => {
      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.fingerprint).toEqual([
        '{{ default }}',
        403,
        'undefined /foo/bar', // NOTE: There is a bug in nock that causes the method to be undefined.
      ]);
    });
  });

  describe('POST with JSON body', () => {
    let event;
    let hint;

    beforeEach(async () => {
      nock('https://www.example.com').post('/foo/bar').reply(401, 'This is the really long body. This is the really long body. This is the really long body. This is the really long body. This is the really long body. This is the really long body. This is the really long body. This is the really long body. This is the really long body. This is the really long body.');
      const error = await axios.post('https://www.example.com/foo/bar', { hello: 'hi' }).catch((error) => Promise.resolve(error));

      event = buildEvent();
      hint = buildHint(error);
    });

    it('adds truncated response body', () => {
      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.extra.response.body).toMatch(/^This is the really long body/);
      expect(decoratedEvent.extra.response.body.length).toEqual(255);
    });

    it('adds parsed request body', () => {
      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.extra.request.body).toEqual({ hello: 'hi' });
    });
  });

  describe('POST with form body', () => {
    let event;
    let hint;

    beforeEach(async () => {
      nock('https://www.example.com').post('/foo/bar').reply(401);
      const error = await axios.post('https://www.example.com/foo/bar', 'hi=hello').catch((error) => Promise.resolve(error));

      event = buildEvent();
      hint = buildHint(error);
    });

    it('adds raw request body', () => {
      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.extra.request.body).toEqual('hi=hello');
    });
  });

  describe('POST with invalid JSON body', () => {
    let event;
    let hint;

    beforeEach(async () => {
      nock('https://www.example.com')
        .post('/foo/bar')
        .reply(400);

      const error = await axios.post(
        'https://www.example.com/foo/bar',
        'invalid-json',
        {
          headers: { 'Content-Type': 'application/json' }
        }
      ).catch((error) => Promise.resolve(error));

      event = buildEvent();
      hint = buildHint(error);
    });

    it('returns raw body when JSON parsing fails', () => {
      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.extra.request.body).toEqual('invalid-json');
    });
  });

  describe('POST with different content types', () => {
    let event;
    let hint;

    beforeEach(async () => {
      nock('https://www.example.com')
        .post('/foo/bar')
        .reply(400);

      const error = await axios.post(
        'https://www.example.com/foo/bar',
        'test-data',
        {
          headers: { 'Content-Type': 'text/plain' }
        }
      ).catch((error) => Promise.resolve(error));

      event = buildEvent();
      hint = buildHint(error);
    });

    it('does not attempt to parse non-JSON content types', () => {
      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.extra.request.body).toEqual('test-data');
    });
  });

  describe('Response with non-string data', () => {
    it('handles non-string response data', () => {
      const error = new Error('Test error');
      error.response = {
        status: 400,
        headers: {},
        data: { message: 'error message' },
        request: { method: 'GET', path: '/test', getHeader: () => 'test', getHeaders: () => ({}) }
      };
      const event = buildEvent();
      const hint = buildHint(error);
      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);
      expect(decoratedEvent.extra.response.body).toMatch('[object Object]');
    });
  });

  describe('Given a generic error', () => {
    it('does nothing', () => {
      const event = buildEvent();
      const hint = buildHint(new Error('boom'));

      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.extra.response).toEqual(undefined);
      expect(decoratedEvent.extra.request).toEqual(undefined);
    });
  });

  describe('Error validation', () => {
    it('handles error without response', () => {
      const error = new Error('Network error');
      const event = buildEvent();
      const hint = buildHint(error);

      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.extra.response).toBeUndefined();
      expect(decoratedEvent.extra.request).toBeUndefined();
    });

    it('handles error with response but no request', () => {
      const error = new Error('API error');
      error.response = {
        status: 500,
        headers: {}
      };
      const event = buildEvent();
      const hint = buildHint(error);

      const decoratedEvent = AxiosErrorDecorator.decorate(event, hint);

      expect(decoratedEvent.extra.response).toBeUndefined();
      expect(decoratedEvent.extra.request).toBeUndefined();
    });
  });
});
