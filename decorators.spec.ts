import {
  connect,
  set,
  connection,
  ClientSession,
  model,
  Model,
  Schema,
  startSession,
} from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { Session, Transactional } from './decorators';

interface ITest {
  name: string;
}

class TestClass {
  constructor(
    private testModel: Model<ITest>,
    private test2Model: Model<ITest>
  ) {}

  @Transactional
  async function_1(throwError: boolean, @Session session?: ClientSession) {
    const record = new this.testModel({ name: 'process 1 create' });
    await record.save({ session });

    if (throwError) {
      throw new Error('function_1 throw error');
    }

    record.name = record.name + ' and process 2 edit';
    await record.save({ session });
  }

  @Transactional
  async function_2(throwError: boolean, @Session session?: ClientSession) {
    await this.test2Model.create([{ name: 'process 1 create' }], { session });

    if (throwError) {
      throw new Error('function_2 throw error');
    }

    await this.test2Model.updateOne(
      { name: 'process 1 create' },
      { $set: { name: 'process 1 create and process 2 edit' } },
      { session }
    );
  }

  deleteAll() {
    return Promise.all([
      this.testModel.deleteMany({}),
      this.test2Model.deleteMany({}),
    ]);
  }
}

// May require additional time for downloading MongoDB binaries
jest.setTimeout(600000);

describe('mongoose-session-decorator', () => {
  let mongoServer: MongoMemoryReplSet;
  let testClassModel: TestClass;
  let testModel: Model<ITest>;
  let test2Model: Model<ITest>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const mongoUri = mongoServer.getUri();
    set('useCreateIndex', true);
    await connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const testSchema = new Schema<ITest>({ name: String });
    testModel = model<ITest>('test', testSchema, 'test');
    await testModel.createCollection();
    test2Model = model<ITest>('test2', testSchema, 'test2');
    await test2Model.createCollection();

    testClassModel = new TestClass(testModel, test2Model);
  });

  afterAll(async () => {
    await connection.close();
    await mongoServer.stop();
  });
  afterEach(async () => {
    await testClassModel.deleteAll();
  });

  test('should commit with internal seession', async () => {
    await testClassModel.function_1(false);

    const result = await testModel.find({});
    expect(result.length).toEqual(1);
    expect(result[0].name).toEqual('process 1 create and process 2 edit');
  });

  test('should rollback with internal seession', async () => {
    await expect(testClassModel.function_1(true)).rejects.toThrow(
      'function_1 throw error'
    );
    const result = await testModel.find({});
    expect(result.length).toEqual(0);
  });

  test('should commit with external seession', async () => {
    const session = await startSession();
    session.startTransaction();

    await testClassModel.function_1(false, session);
    await testClassModel.function_2(false, session);

    await session.commitTransaction();
    session.endSession();

    const result = await testModel.find({});
    expect(result.length).toEqual(1);
    expect(result[0].name).toEqual('process 1 create and process 2 edit');

    const result2 = await test2Model.find({});
    expect(result2.length).toEqual(1);
    expect(result2[0].name).toEqual('process 1 create and process 2 edit');
  });

  test('should rollback with external seession', async () => {
    const session = await startSession();
    session.startTransaction();

    await testClassModel.function_1(false, session);
    await expect(testClassModel.function_2(true, session)).rejects.toThrow(
      'function_2 throw error'
    );

    const result = await testModel.find({});
    expect(result.length).toEqual(0);

    const result2 = await test2Model.find({});
    expect(result2.length).toEqual(0);
  });
});
