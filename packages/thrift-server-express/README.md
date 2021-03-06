# Thrift Server Express

Express middleware for processing Thrift requests.

## Usage

Adding Thrift support to Express is as easy as just including the provided middleware. Because we are just including middleware it is easy for the same server to support APIs beyond Thrift RPC, such as REST.

### Codegen

Requires @creditkarma/thrift-typescript >= v3.0.0

The easiest way to get started is to generate your thrift services using @creditkarma/thrift-typescript.

```sh
npm install --save-dev @creditkarma/thrift-typescript
```

Add a script to your package.json to codegen. The 'target' option is important to make thrift-typescript generate for this library instead of the Apache libraries.

```json
"scripts": {
  "codegen": "thrift-typescript --target thrift-server --sourceDir thrift --outDir codegen
}
```

### Example Service

```c
service Calculator {
  i32 add(1: i32 left, 2: i32 right)
  i32 subtract(1: i32 left, 2: i32 right)
}
```

### Install

```sh
npm install --save express
npm install --save thrift
npm install --save @creditkarma/thrift-server-express
```

### Use the Plugin

To get things working you need to register the middleware as you would any other express middleware. An important thing to note is the use of bodyParse.raw(). This is required, Thrift must operate on the raw binary Buffers.

```typescript
import * as bodyParser from 'body-parser'
import * as express from 'express'
import { ThriftServerExpress } from '../main'

import {
    Calculator,
} from './codegen/calculator'

const PORT = 8080

const app = express()

/**
 * Implementation of our thrift service.
 *
 * Notice the optional final parameter, "context" - this is the Express request object,
 * passed along to our service by the Thrift Express middleware. Thus, you have access to
 * all HTTP request data from within your service implementation.
 */
const serviceHandlers: Calculator.IHandler<express.Request> = {
    add(left: number, right: number, context?: express.Request): number {
        return left + right
    },
    subtract(left: number, right: number, context?: express.Request): number {
        return left - right
    },
}

app.use(
    '/thrift',
    bodyParser.raw(),
    ThriftServerExpress<Calculator.Processor>({
        serviceName: 'calculator-service',
        handler: new Calculator.Processor(serviceHandlers),
    }),
)

app.get('/control', (req: express.Request, res: express.Response) => {
    res.send('PASS')
})

app.listen(PORT, () => {
    console.log(`Express server listening on port: ${PORT}`)
})
```

#### Options

* serviceName (required): The name of your service. Used for logging and tracing.
* handler (required): The service Processor instance to handle service method calls.
* transport (optional): The kind of Thrift transport to use. Only 'buffered' is currently supported.
* protocol (optional): The kind of Thrift protocol to use, either 'binary' or 'compact'.

### Thrift Server Factory

In the event that you will be creating an Express server only to serve Thrift, you can use the `createThriftServer` factory function to create a `Express.Application` and register the `thriftExpress` middleware in one step.

The factory function takes one additional config options `path`, the path on which to serve your Thrift API. The `path` parameter is optional and will default to `/thrift`. All of the plugin options are the same as above and passed in under the key `thriftOptions`.

```typescript
import * as express from 'express'
import { createThriftServer } from '@creditkarma/thrift-server-express'
import { Calculator } from './codegen/calculator'

const PORT = 8080

const serviceHandlers: Calculator.IHandler<express.Request> = {
    add(left: number, right: number, context?: express.Request): number {
        return left + right
    },
    subtract(left: number, right: number, context?: express.Request): number {
        return left - right
    },
}

const app: express.Application = createThriftServer({
    path: '/thrift',
    thriftOptions: {
        serviceName: 'calculator-service',
        handler: new Calculator.Processor(serviceHandlers),
    },
})

app.listen(PORT, () => {
    console.log(`Express server listening on port: ${PORT}`)
})
```

## Contributing

For more information about contributing new features and bug fixes, see our [Contribution Guidelines](../../CONTRIBUTING.md).
External contributors must sign Contributor License Agreement (CLA)

## License

This project is licensed under [Apache License Version 2.0](./LICENSE)
