import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeMonthlyReport} from '../functions/_shared/academy-monthly-report.mjs';
const row={student_id:'synthetic',course:'Synthetic course',approved_at:'2026-10-01T12:00:00Z',issued_at:'2026-11-01T01:00:00Z',certificate_id:'synthetic-cert',external_id:'SYN-1',issuer:'Synthetic issuer',unit_cost:'1000',currency:'CLP',reconciliation_status:'pending',revoked_at:null};
const report=rows=>({month:'2026-10',timezone:'America/Santiago',rows});
test('monthly Excel input uses Chile issuance month, numeric cost and no duplicates',()=>{
 const result=normalizeMonthlyReport(report([row]));assert.equal(result.rows[0].unit_cost,1000);
 assert.throws(()=>normalizeMonthlyReport(report([row,row])),/duplicado/);
 assert.throws(()=>normalizeMonthlyReport(report([{...row,issued_at:'2026-11-01T12:00:00Z'}])),/Fechas/);
 assert.throws(()=>normalizeMonthlyReport(report([{...row,unit_cost:null}])),/Costo/);
 assert.throws(()=>normalizeMonthlyReport(report([{...row,revoked_at:'2026-11-02T12:00:00Z'}])),/Anulación/);
 assert.equal(normalizeMonthlyReport(report([{...row,revoked_at:'2026-11-02T12:00:00Z',reconciliation_status:'credit_required'}])).rows.length,1);
 assert.equal(normalizeMonthlyReport(report([])).rows.length,0);
});
