<script setup>
import {s,canEdit,addGuest,run,navigate} from './store';
</script>
<template><div v-if="canEdit" class="row registration-actions"><MButton variant="secondary" @click="s.importMode=s.rowFilters.attendance_mode?.[0]||'auto';run(()=>navigate('nguon-du-lieu'))">Nhập khách</MButton><MButton variant="primary" @click="addGuest">Thêm khách</MButton></div></template>
