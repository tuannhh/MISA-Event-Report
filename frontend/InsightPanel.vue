<script setup>
import {s,insights} from './store';
</script>
<template><section class="card stack" aria-label="Nhận xét từ Gemini">
<div class="toolbar"><h3>Nhận xét từ Gemini</h3><MButton variant="secondary" :loading="s.insightBusy" :disabled="s.reportBusy||!s.report?.current.total" @click="insights">Phân tích lại</MButton></div>
<div v-if="s.insightBusy" role="status"><p>Gemini đang phân tích số liệu tổng hợp…</p><progress aria-label="Đang phân tích số liệu"/></div>
<p v-if="s.insightError" class="notice" role="status">Chưa lấy được nhận xét AI: {{s.insightError}} Số liệu thống kê vẫn sử dụng được.</p>
<template v-if="s.insight"><p>{{s.insight.summary}}</p><p v-for="o in s.insight.observations" :key="o">{{o}}</p></template>
<p v-else-if="!s.insightBusy&&!s.insightError" class="muted">Nhận xét được tạo tự động khi có dữ liệu phù hợp.</p>
</section></template>
