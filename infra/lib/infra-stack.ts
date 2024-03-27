import path = require('path')
import { CfnOutput, CfnResource, Stack, type StackProps } from 'aws-cdk-lib'
import { CfnIntegration, CfnRoute, HttpApi } from 'aws-cdk-lib/aws-apigatewayv2'
import { Vpc } from 'aws-cdk-lib/aws-ec2'
import { Cluster, ContainerImage, CpuArchitecture } from 'aws-cdk-lib/aws-ecs'
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns'
import type { Construct } from 'constructs'

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    /**
     * TODO:
     * - create a public, private(with NAT Gateway), and vpc-only subnets
     * - create a bastion host with an auto scaling group role
     */
    const vpc = Vpc.fromLookup(this, 'VPC', {
      vpcId: 'vpc-06eb7a66219540c7a',
    })

    const cluster = new Cluster(this, 'MyCluster', {
      vpc: vpc,
    })

    /**
     * NOTE:
     * ApplicationLoadBalancedFargateService is an L2 Construct
     * We would need to consider how to create the same construct using the L1 CfnResource Construct
     * or at least understand the tradeoffs.
     */
    const fargate = new ApplicationLoadBalancedFargateService(this, 'MyFargateService', {
      assignPublicIp: false,
      cluster: cluster,
      cpu: 512,
      desiredCount: 1,
      memoryLimitMiB: 2048,
      publicLoadBalancer: false,
      taskImageOptions: {
        image: ContainerImage.fromAsset(path.join(__dirname, '../../')),
      },
      /**
       * NOTE:
       * - this is dependant on the machine the stack is deployed from.
       * - this image is built at deploy time
       * - this needs to be considered when adding CI/CD
       */
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.ARM64,
      },
    })

    const httpVpcLink = new CfnResource(this, 'HttpVpcLink', {
      type: 'AWS::ApiGatewayV2::VpcLink',
      properties: {
        Name: 'V2 VPC Link',
        SubnetIds: vpc.privateSubnets.map((m) => m.subnetId),
      },
    })

    /**
     * NOTE:
     * HttpApi is an L2 Construct with a decent override API
     * We would need to consider how to create the same construct using the L1 CfnResource Construct
     * or at least understand the tradeoffs.
     */
    const api = new HttpApi(this, 'HttpApiGateway', {
      apiName: 'ApigwFargate',
      description: 'Integration between apigw and Application Load-Balanced Fargate Service',
    })

    const integration = new CfnIntegration(this, 'HttpApiGatewayIntegration', {
      apiId: api.httpApiId,
      connectionId: httpVpcLink.ref,
      connectionType: 'VPC_LINK',
      description: 'API Integration with AWS Fargate Service',
      integrationMethod: 'GET', // for GET and POST, use ANY
      integrationType: 'HTTP_PROXY',
      integrationUri: fargate.listener.listenerArn,
      payloadFormatVersion: '1.0', // supported values for Lambda proxy integrations are 1.0 and 2.0. For all other integrations, 1.0 is the only supported value
    })

    new CfnRoute(this, 'Route', {
      apiId: api.httpApiId,
      routeKey: 'GET /', // for something more general use 'ANY /{proxy+}'
      target: `integrations/${integration.ref}`,
    })

    new CfnOutput(this, 'APIGatewayUrl', {
      description: 'API Gateway URL to access the GET endpoint',
      value: api.url!,
    })
  }
}
