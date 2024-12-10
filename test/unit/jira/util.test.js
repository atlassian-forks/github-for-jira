const fs = require('fs');
const path = require('path');
const getJiraUtil = require('../../../lib/jira/util');
const { getJiraId } = require('../../../lib/jira/util/id');

describe('Jira util', () => {
  function loadFixture(name) {
    const base = path.join(__dirname, '../../fixtures/text', name);
    const source = fs.readFileSync(`${base}.source.md`).toString('utf-8').trim();
    const rendered = fs.readFileSync(`${base}.rendered.md`).toString('utf-8').trim();
    return { source, rendered };
  }

  describe('#addJiraIssueLinks', () => {
    let util;
    let jiraClient;

    beforeEach(() => {
      jiraClient = {
        baseURL: 'http://example.com',
        issues: td.object(['get']),
      };

      util = getJiraUtil(jiraClient);
    });

    it('it should handle multiple Jira references appropriately', () => {
      const { source, rendered } = loadFixture('multiple-links');
      const issues = [
        {
          key: 'TEST-2019',
          fields: {
            summary: 'First Issue',
          },
        },
        {
          key: 'TEST-2020',
          fields: {
            summary: 'Second Issue',
          },
        },
        {
          key: 'TEST-2021',
          fields: {
            summary: 'Third Issue',
          },
        },
      ];

      const result = util.addJiraIssueLinks(source, issues);
      expect(result).toBe(rendered);
    });

    it('should linkify Jira references to valid issues', () => {
      const { source, rendered } = loadFixture('existing-reference-link');
      const issues = [
        {
          key: 'TEST-2019',
          fields: {
            summary: 'Example Issue',
          },
        },
      ];

      const result = util.addJiraIssueLinks(source, issues);
      expect(result).toBe(rendered);
    });

    it('should not add reference links if already present', () => {
      const { source, rendered } = loadFixture('previously-referenced');
      const issues = [
        {
          key: 'TEST-2019',
          fields: {
            summary: 'Example Issue',
          },
        },
      ];
      const result = util.addJiraIssueLinks(source, issues);
      expect(result).toBe(rendered);
    });

    it('should not linkify Jira references to invalid issues', () => {
      const text = 'Should not linkify [TEST-123] as a link';
      const issues = [];

      const result = util.addJiraIssueLinks(text, issues);

      expect(result).toBe('Should not linkify [TEST-123] as a link');
    });

    it('should linkify only Jira references to valid issues', () => {
      const { source, rendered } = loadFixture('valid-and-invalid-issues');
      const issues = [
        {
          key: 'TEST-200',
          fields: {
            summary: 'Another Example Issue',
          },
        },
      ];

      const result = util.addJiraIssueLinks(source, issues);
      expect(result).toBe(rendered);
    });

    it('should only pull issue keys from reference links', () => {
      const { source, rendered } = loadFixture('find-existing-references');
      const issues = [
        {
          key: 'TEST-2019',
          fields: {
            summary: 'First Issue',
          },
        },
        {
          key: 'TEST-2020',
          fields: {
            summary: 'Second Issue',
          },
        },
        {
          key: 'TEST-2021',
          fields: {
            summary: 'Third Issue',
          },
        },
      ];

      const result = util.addJiraIssueLinks(source, issues);

      expect(result).toBe(rendered);
    });
  });

  describe('#unfurl', () => {
    let util;
    let jiraClient;

    beforeEach(() => {
      jiraClient = {
        baseURL: 'http://example.com',
        issues: {
          parse: td.function(),
          getAll: td.function(),
        },
      };

      util = getJiraUtil(jiraClient);
    });

    it('should return undefined when no issues are found', async () => {
      td.when(jiraClient.issues.parse('text without issues')).thenReturn(null);

      const result = await util.unfurl('text without issues');
      expect(result).toBeUndefined();
    });

    it('should return undefined when no valid issues exist', async () => {
      td.when(jiraClient.issues.parse('text with [TEST-123]')).thenReturn(['TEST-123']);
      td.when(jiraClient.issues.getAll(['TEST-123'])).thenResolve([]);

      const result = await util.unfurl('text with [TEST-123]');
      expect(result).toBeUndefined();
    });

    it('should return linkified text for valid issues', async () => {
      const text = 'Issue reference [TEST-123] in text';
      const issues = [{
        key: 'TEST-123',
        fields: { summary: 'Test Issue' }
      }];

      td.when(jiraClient.issues.parse(text)).thenReturn(['TEST-123']);
      td.when(jiraClient.issues.getAll(['TEST-123'])).thenResolve(issues);

      const result = await util.unfurl(text);
      expect(result).toBe('Issue reference [TEST-123] in text\n\n[TEST-123]: http://example.com/browse/TEST-123');
    });
  });

  describe('#runJiraCommands', () => {
    let util;
    let jiraClient;

    beforeEach(() => {
      jiraClient = {
        issues: {
          comments: {
            addForIssue: td.function(),
          },
          worklogs: {
            addForIssue: td.function(),
          },
          transitions: {
            getForIssue: td.function(),
            updateForIssue: td.function(),
          }
        }
      };

      util = getJiraUtil(jiraClient);
    });

    it('should handle comment commands', async () => {
      const commands = [{
        kind: 'comment',
        issueKeys: ['TEST-123'],
        text: 'Test comment'
      }];

      td.when(jiraClient.issues.comments.addForIssue('TEST-123', { body: 'Test comment' }))
        .thenResolve({ id: '1' });

      await util.runJiraCommands(commands);
      td.verify(jiraClient.issues.comments.addForIssue('TEST-123', { body: 'Test comment' }));
    });

    it('should handle worklog commands', async () => {
      const commands = [{
        kind: 'worklog',
        issueKeys: ['TEST-123'],
        time: 3600,
        text: 'Work done'
      }];

      td.when(jiraClient.issues.worklogs.addForIssue('TEST-123', {
        timeSpentSeconds: 3600,
        comment: 'Work done'
      })).thenResolve({ id: '1' });

      await util.runJiraCommands(commands);
      td.verify(jiraClient.issues.worklogs.addForIssue('TEST-123', {
        timeSpentSeconds: 3600,
        comment: 'Work done'
      }));
    });
  });

  describe('#getJiraId', () => {
    it('should handle various branch name formats', () => {
    expect(getJiraId('AP-3-large_push')).toEqual('AP-3-large_push');
    expect(getJiraId('AP-3-large_push/foobar')).toEqual('~41502d332d6c617267655f707573682f666f6f626172');
    expect(getJiraId('feature-something-cool')).toEqual('feature-something-cool');
    expect(getJiraId('feature/something-cool')).toEqual('~666561747572652f736f6d657468696e672d636f6f6c');
    });
  });
});
