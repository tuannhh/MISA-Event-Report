<script setup>
import {s,canEdit,addGuest,run,navigate} from './store';
import ParticipationTabs from './ParticipationTabs.vue';
defineProps({mobile:Boolean});
</script><template><section class="stack"><ParticipationTabs registrations :mobile="mobile"/><div class="toolbar registration-actions"><MSelect :model-value="s.rowFilters.registration_status?.[0]||'all'" aria-label="Tình trạng đăng ký" :options="[{value:'all',label:'Tất cả khách'},{value:'registered',label:'Đã đăng ký'},{value:'invited',label:'Đã mời — chưa đăng ký'}]" @update:model-value="s.rowFilters={...s.rowFilters,registration_status:$event==='all'?[]:[$event]}"/><div v-if="canEdit" class="row"><MButton variant="secondary" @click="s.importMode=s.rowFilters.attendance_mode?.[0]||'auto';run(()=>navigate('nguon-du-lieu'))">Nhập khách</MButton><MButton variant="primary" @click="addGuest">Thêm khách</MButton></div></div></section></template>
