import test from 'node:test';
import assert from 'node:assert/strict';
import {orthoMetricsMarkup,orthoMetricsCsv} from '../academy/competencias/workflow.mjs';

test('Ortho teacher metrics show no-data states and escape database content',()=>{
 const html=orthoMetricsMarkup({courseVersion:'v1',status:'sin_matriculas',metricsAreObservedEvents:true,summary:{enrollments:0,completionCount:0,approvalCount:0,attemptsStarted:0,attemptsSubmitted:0,averageMinutes:null},scoreDistribution:[],moduleResults:[],itemResults:[],assessmentVersions:[],editorialReviews:[],commercialOffers:[],releaseControls:{}});
 assert.match(html,/0/);assert.match(html,/Sin datos observados/);assert.match(html,/Aún no hay puntajes registrados/);assert.match(html,/no estima resultados/);
 const hostile=orthoMetricsMarkup({courseVersion:'<svg onload=x>',status:'ok',metricsAreObservedEvents:true,summary:{},moduleResults:[{module:'<img src=x>',competency:'C',meanPercent:62,responses:3}],itemResults:[{module:'M',learningOutcome:'<script>x',errorPercent:90,responses:2}],scoreDistribution:[],assessmentVersions:[],editorialReviews:[],commercialOffers:[],releaseControls:{}});
 assert.doesNotMatch(hostile,/<svg|<img|<script/);assert.match(hostile,/&lt;svg/);assert.match(hostile,/&lt;img/);
});

test('Ortho aggregate CSV quotes commas, quotes and newlines without learner identifiers',()=>{
 const csv=orthoMetricsCsv({courseVersion:'2026.10',status:'observed',summary:{enrollments:4},moduleResults:[{module:'M,1',competency:'"Razonamiento"',learningOutcome:'LO\n1',meanPercent:75,responses:4}],itemResults:[],scoreDistribution:[]});
 assert.match(csv,/"M,1"/);assert.match(csv,/"""Razonamiento"""/);assert.match(csv,/"LO\n1"/);assert.doesNotMatch(csv,/user_id|email|student/i);
});
