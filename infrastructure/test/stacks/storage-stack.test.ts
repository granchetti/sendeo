import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { StorageStack } from '../../lib/stacks/storage-stack';

describe('StorageStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new StorageStack(app, 'TestStorageStack', {
      env: { account: '000000000000', region: 'us-east-1' },
    });
    template = Template.fromStack(stack);
  });

  test('defines exactly two DynamoDB tables', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 2);
  });

  test('Routes table has the correct properties', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'Routes',
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: {
        AttributeName: 'ttl',
        Enabled: true,
      },
      KeySchema: [
        { AttributeName: 'routeId', KeyType: 'HASH' },
      ],
      AttributeDefinitions: Match.arrayWith([
        { AttributeName: 'routeId', AttributeType: 'S' },
        { AttributeName: 'distanceKm', AttributeType: 'N' },
        { AttributeName: 'createdAt', AttributeType: 'N' },
      ]),
    });
  });

  test('Routes table has a GSI named GSI1 on distanceKm and createdAt', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([
        {
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'distanceKm', KeyType: 'HASH' },
            { AttributeName: 'createdAt',   KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ]),
    });
  });

  test('UserState table has the correct properties', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'UserState',
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
      ],
    });
  });
});
