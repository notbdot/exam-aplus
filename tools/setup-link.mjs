// Run inside the container by its owner. Output is a private one-time credential, not a server log.
import {existsSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
const dir=process.env.DATA_DIR||'/data';
if(existsSync(join(dir,'auth.json')))throw Error('Already enrolled; this command does not reset an account');
writeFileSync(join(dir,'bootstrap'),randomBytes(32).toString('hex'),{mode:0o600});
console.log(`${process.env.ORIGIN||'http://localhost:3000'}/enroll#${readFileSync(join(dir,'bootstrap'),'utf8')}`);
