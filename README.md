# Llamafolio API

## Adapters

An adapter specifies how to resolve the balances of an address for your protocol.

To learn more about adapters, check our docs here.

## Command Line Testing

To test your adapter, simply the command below which will output most details an adapter can find

```
$ npm run adapter curve 0x0000000000000000000000000000000000000000000000000000000
```

## Usage

### Invocation

After successful deployment, you can call the created application via HTTP:

```bash
curl https://xxxxxxx.execute-api.us-east-1.amazonaws.com/
```

Which should result in response similar to the following (removed `input` content for brevity):

```json
{
  "message": "Go Serverless v2.0! Your function executed successfully!",
  "input": {
    ...
  }
}
```

### Local development

You can invoke your function locally by using the following command:

```bash
serverless invoke local --function hello
```

Which should result in response similar to the following:

```
{
  "statusCode": 200,
  "body": "{\n  \"message\": \"Go Serverless v3.0! Your function executed successfully!\",\n  \"input\": \"\"\n}"
}
```
