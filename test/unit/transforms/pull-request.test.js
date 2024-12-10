const transformPullRequest = require('../../../lib/transforms/pull-request');

describe('pull_request transform', () => {
  it('should return undefined data when no issue keys are found', async () => {
    const pullRequestList = JSON.parse(JSON.stringify(require('../../fixtures/api/transform-pull-request-list.json')));
    pullRequestList[0].title = 'No issue keys here';
    pullRequestList[0].head.ref = 'feature-branch';
    const payload = {
      pull_request: pullRequestList[0],
      repository: {
        id: 1234568,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        owner: { login: 'test-login' },
        html_url: 'https://github.com/test-owner/test-repo',
      }
    };

    const { data } = await transformPullRequest(payload, payload.pull_request.user);
    expect(data).toBeUndefined();
  });

  it('should return undefined data when pull request head repo is missing', async () => {
    const pullRequestList = JSON.parse(JSON.stringify(require('../../fixtures/api/transform-pull-request-list.json')));
    pullRequestList[0].title = '[TES-123] Test PR';
    pullRequestList[0].head.repo = null;
    const payload = {
      pull_request: pullRequestList[0],
      repository: {
        id: 1234568,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        owner: { login: 'test-login' },
        html_url: 'https://github.com/test-owner/test-repo',
      }
    };

    const { data } = await transformPullRequest(payload, payload.pull_request.user);
    expect(data).toBeUndefined();
  });

  it('should map status correctly for different PR states', async () => {
    const pullRequestList = JSON.parse(JSON.stringify(require('../../fixtures/api/transform-pull-request-list.json')));
    pullRequestList[0].title = '[TES-123] Test PR';
    const basePayload = {
      pull_request: pullRequestList[0],
      repository: {
        id: 1234568,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        owner: { login: 'test-login' },
        html_url: 'https://github.com/test-owner/test-repo',
      }
    };

    Date.now = jest.fn(() => 12345678);

    // Test OPEN state
    const openPayload = { ...basePayload, pull_request: { ...basePayload.pull_request, state: 'open', merged: false } };
    const openResult = await transformPullRequest(openPayload, openPayload.pull_request.user);
    expect(openResult.data.pullRequests[0].status).toBe('OPEN');

    // Test DECLINED state
    const declinedPayload = { ...basePayload, pull_request: { ...basePayload.pull_request, state: 'closed', merged: false } };
    const declinedResult = await transformPullRequest(declinedPayload, declinedPayload.pull_request.user);
    expect(declinedResult.data.pullRequests[0].status).toBe('DECLINED');

    // Test MERGED state
    const mergedPayload = { ...basePayload, pull_request: { ...basePayload.pull_request, state: 'closed', merged: true } };
    const mergedResult = await transformPullRequest(mergedPayload, mergedPayload.pull_request.user);
    expect(mergedResult.data.pullRequests[0].status).toBe('MERGED');

    // Test unknown state
    const unknownPayload = { ...basePayload, pull_request: { ...basePayload.pull_request, state: 'unknown', merged: false } };
    const unknownResult = await transformPullRequest(unknownPayload, unknownPayload.pull_request.user);
    expect(unknownResult.data.pullRequests[0].status).toBe('UNKNOWN');
  });

  it('should include comment count in pull request data', async () => {
    const pullRequestList = JSON.parse(JSON.stringify(require('../../fixtures/api/transform-pull-request-list.json')));
    pullRequestList[0].title = '[TES-123] Test PR';
    pullRequestList[0].comments = 42;
    const payload = { pull_request: pullRequestList[0], repository: { id: 1234568, name: 'test-repo', full_name: 'test-owner/test-repo', owner: { login: 'test-login' }, html_url: 'https://github.com/test-owner/test-repo' } };

    const { data } = await transformPullRequest(payload, payload.pull_request.user);
    expect(data.pullRequests[0].commentCount).toBe(42);
  });

  it('should not contain branches on the payload if pull request status is closed.', async () => {
    const pullRequestList = JSON.parse(JSON.stringify(require('../../fixtures/api/transform-pull-request-list.json')));
    pullRequestList[0].title = '[TES-123] Branch payload Test';
    const payload = {
      pull_request: pullRequestList[0],
      repository: {
        id: 1234568,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        owner: { login: 'test-login' },
        html_url: 'https://github.com/test-owner/test-repo',
      },
      author: {
        avatar: 'https://avatars0.githubusercontent.com/u/173?v=4',
        name: 'bkeepers',
        url: 'https://api.github.com/users/bkeepers',
      },
    };

    Date.now = jest.fn(() => 12345678);

    const { data } = await transformPullRequest(payload, payload.pull_request.user);
    expect(data).toMatchObject({
      id: 1234568,
      name: 'test-owner/test-repo',
      pullRequests: [
        {
          author: {
            avatar: 'https://avatars0.githubusercontent.com/u/173?v=4',
            name: 'bkeepers',
            url: 'https://api.github.com/users/bkeepers',
          },
          destinationBranch: 'https://github.com/integrations/test/tree/devel',
          displayId: '#51',
          id: 51,
          issueKeys: ['TES-123'],
          lastUpdate: pullRequestList[0].updated_at,
          sourceBranch: 'use-the-force',
          sourceBranchUrl: 'https://github.com/integrations/test/tree/use-the-force',
          status: 'MERGED',
          timestamp: pullRequestList[0].updated_at,
          title: pullRequestList[0].title,
          url: 'https://github.com/integrations/test/pull/51',
          updateSequenceId: 12345678,
        },
      ],
      branches: [],
      url: 'https://github.com/test-owner/test-repo',
      updateSequenceId: 12345678,
    });
  });

  it('should contain branches on the payload if pull request status is different than closed.', async () => {
    const pullRequestList = JSON.parse(JSON.stringify(require('../../fixtures/api/transform-pull-request-list.json')));
    pullRequestList[1].title = '[TES-123] Branch payload Test';
    const payload = {
      pull_request: pullRequestList[1],
      repository: {
        id: 1234568,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        owner: { login: 'test-login' },
        html_url: 'https://github.com/test-owner/test-repo',
      },
      author: {
        avatar: 'https://avatars0.githubusercontent.com/u/173?v=4',
        name: 'bkeepers',
        url: 'https://api.github.com/users/bkeepers',
      },
    };

    const githubMock = {
      pulls: {
        get: () => ({ data: { comments: 1 } }),
      },
    };

    Date.now = jest.fn(() => 12345678);

    const { data } = await transformPullRequest(payload, payload.pull_request.user, githubMock);
    expect(data).toMatchObject({
      id: 1234568,
      name: 'test-owner/test-repo',
      pullRequests: [
        {
          author: {
            avatar: 'https://avatars0.githubusercontent.com/u/173?v=4',
            name: 'bkeepers',
            url: 'https://api.github.com/users/bkeepers',
          },
          destinationBranch: 'https://github.com/integrations/test/tree/devel',
          displayId: '#51',
          id: 51,
          issueKeys: ['TES-123'],
          lastUpdate: pullRequestList[1].updated_at,
          sourceBranch: 'use-the-force',
          sourceBranchUrl: 'https://github.com/integrations/test/tree/use-the-force',
          status: 'OPEN',
          timestamp: pullRequestList[1].updated_at,
          title: pullRequestList[1].title,
          url: 'https://github.com/integrations/test/pull/51',
          updateSequenceId: 12345678,
        },
      ],
      branches: [
        {
          createPullRequestUrl: 'https://github.com/integrations/test/pull/new/use-the-force',
          id: 'use-the-force',
          issueKeys: [
            'TES-123',
          ],
          lastCommit: {
            author: {
              name: 'bkeepers',
            },
            authorTimestamp: '2018-05-04T14:06:56Z',
            displayId: '09ca66',
            fileCount: 0,
            hash: '09ca669e4b5ff78bfa6a9fee74c384812e1f96dd',
            id: '09ca669e4b5ff78bfa6a9fee74c384812e1f96dd',
            issueKeys: [
              'TES-123',
            ],
            message: 'n/a',
            updateSequenceId: 12345678,
            url: 'https://github.com/integrations/test/commit/09ca669e4b5ff78bfa6a9fee74c384812e1f96dd',
          },
          name: 'use-the-force',
          updateSequenceId: 12345678,
          url: 'https://github.com/integrations/test/tree/use-the-force',
        },
      ],
      url: 'https://github.com/test-owner/test-repo',
      updateSequenceId: 12345678,
    });
  });
});
