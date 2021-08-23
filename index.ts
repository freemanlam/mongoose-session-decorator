import { ClientSession } from 'mongoose';
import {
  Session,
  Transactional,
  transactional,
} from './decorators';

function abc(session) {
  console.log('abc', session);
}

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

  transactional(null).then((session) => {
    abc(session);
  });
  transactional(demoSession).then((session) => {
    abc(session);
  });

  const demo = new Demo();
  console.log(await demo.def(demoSession, 345));
  console.log(await demo.xyz(789, null));
})();
