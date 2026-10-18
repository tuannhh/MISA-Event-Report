<script setup>
import {computed} from 'vue';
import {s} from './store';
const p=defineProps({registrations:Boolean,mobile:Boolean});
const selected=computed({get:()=>p.registrations?s.rowFilters.attendance_mode?.[0]||'all':s.filters.mode,set:v=>{if(p.registrations)s.rowFilters={...s.rowFilters,attendance_mode:v==='all'?[]:[v]};else s.filters.mode=v;}});
</script><template><MTabs v-if="s.event.mode==='hybrid'" v-model="selected" class="participation-tabs" :tabs="[{key:'all',label:'Tất cả'},{key:'online',label:'Online'},{key:'offline',label:'Offline'},{key:'unknown',label:mobile?'Chưa rõ':'Chưa xác định'}]"/></template>
