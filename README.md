# Mongoose Session Decorators
Note: this is a POC ONLY.

Decorator to handle mongoose session, if no session passed-in, a internal session will be created and end inside the decorated method.

## Usage
Demo code also in `index.ts`.

```ts
import { ClientSession } from 'mongoose';
import { Session, Transactional } from './decorators';

export class Demo {
  @Transactional
  def(@Session session: ClientSession, a) {
    console.log('Demo def', session);
    return 'def!';
  }

  @Transactional
  xyz(session, @Session s: ClientSession) {
    console.log('Demo xyx', s);
    return Promise.resolve('xyz!');
  }
}

(async () => {
  const demoSession = 'demo_session' as any;
  const demo = new Demo();
  console.log(await demo.def(demoSession, 345));
  console.log(await demo.xyz(789, null));
})();

```