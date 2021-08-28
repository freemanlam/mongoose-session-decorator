import { startSession, ClientSession } from 'mongoose';

/**
 * Generate session without using decorators
 */
export const transactional = async (session?: ClientSession) => {
  if (!session) {
    // TODO: POC only
    session = 'internal session' as any; // await startSession();
  }
  return session;
};


/**
 * Method Decorator to control mongo client session create and commit
 */
export const Transactional = (
  target: Object,
  propertyKey: string,
  descriptor: PropertyDescriptor,
): PropertyDescriptor => {
  const method = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    let session: ClientSession;
    let hasSessionInParam = false;

    // try to get session from parameters
    const sessionParamIndex = target[`${propertyKey}_mongoose_session`];
    if (typeof sessionParamIndex === 'number' && args[sessionParamIndex]) {
      session = args[sessionParamIndex];
      hasSessionInParam = true;
    }

    // if no session, create one
    session = await transactional(session);
    args[sessionParamIndex] = session;

    // invoke original method
    let rtn = method.apply(this, args);
    // handle if method returns a Promise
    if (rtn instanceof Promise) {
      rtn = await rtn;
    }

    // end transation if use internal session
    if (!hasSessionInParam) {
      // TODO: POC only
      console.log('commit internal transaction');
      // session.commitTransaction();
      // session.endSession();
    }

    return rtn;
  };
  return descriptor;
};

/**
 * Parameter Decorator to declare mongo client session param
 */
export const Session = (
  target: Object,
  propertyKey: string,
  index: number,
): void => {
  const metadataKey = `${propertyKey}_mongoose_session`;
  target[metadataKey] = index;
};
