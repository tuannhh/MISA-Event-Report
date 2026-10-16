<script setup>
import {s,sourceValue,resetFilters,number,dateText,modeOptions} from './store';
</script>
<template><section class="card stack" aria-label="Bộ lọc báo cáo">
<div class="grid-form"><label class="field">Từ ngày submit<MDatePicker v-model="s.filters.from" /></label><label class="field">Đến ngày submit<MDatePicker v-model="s.filters.to" /></label><label class="field">So sánh từ ngày<MDatePicker v-model="s.filters.compareFrom" /></label><label class="field">So sánh đến ngày<MDatePicker v-model="s.filters.compareTo" /></label>
<label class="field">Phiên dữ liệu<MCombobox v-model="s.filters.snapshot" :options="[{value:'',label:'Bản mới nhất'},...s.snapshots.map(v=>({value:v.id,label:dateText(v.created_at)+' · '+v.label}))]" /></label>
<label class="field">Hình thức tham dự<MSelect v-model="s.filters.mode" :options="[{value:'all',label:'Tất cả hình thức'},...modeOptions]" /></label></div>
<div><h3>Lọc nguồn khách</h3><p class="muted">Tự cập nhật KPI, bảng, biểu đồ và bản xuất khi chọn. Các điều kiện được kết hợp đồng thời.</p></div>
<div class="grid-form"><label v-for="d in s.report?.sourceDimensions||[]" :key="d.name" class="field">{{d.name}}<MCombobox :model-value="Object.hasOwn(s.sources,d.name)?s.sources[d.name]:'__ALL__'" :options="[{value:'__ALL__',label:'Tất cả'},...d.values.map(v=>({value:v.value,label:v.label+' ('+number(v.count)+')'}))]" @update:model-value="sourceValue(d.name,$event)" /></label></div>
<div class="row justify-between"><span class="muted">Ngày Việt Nam · dd/mm/yyyy · UTC+7</span><MButton variant="secondary" @click="resetFilters">Đặt lại bộ lọc</MButton></div></section></template>
