import aws from 'aws-sdk'

async function main() {
  // argv[0]: ts-node
  // argv[1]: invalidate-protocols.ts

  const paths = ['/protocols']
  const uniqueId = 'cli-' + Date.now()

  await new aws.CloudFront()
    .createInvalidation({
      DistributionId: 'E2I3QY2GEAXC98',
      InvalidationBatch: {
        CallerReference: uniqueId,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    })
    .promise()

  console.log('Invalidated paths', paths)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
