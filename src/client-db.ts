import Dexie,{type Table} from 'dexie';
import type {BillComparisonRecord} from './domain/bill-comparison';
export type OutboxItem={id:string;payload:unknown;createdAt:number;attempts:number;lastError?:string};
export class LocalDatabase extends Dexie {
  outbox!:Table<OutboxItem,string>;
  billComparisons!:Table<BillComparisonRecord,string>;
  constructor(){
    super('idea-bill-anomaly-detective');
    this.version(1).stores({outbox:'id,createdAt,attempts'});
    this.version(2).stores({outbox:'id,createdAt,attempts',billComparisons:'id,status,updatedAt'});
  }
}
export const localDatabase=new LocalDatabase();
