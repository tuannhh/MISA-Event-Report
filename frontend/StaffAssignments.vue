<script setup>
import {ref,onMounted} from 'vue';
import {s,api,run,notify,loadMembers} from './store';
import PagedRecords from './PagedRecords.vue';
const rows=ref([]),code=ref(''),member=ref('');
const base=()=>`/api/events/${s.event.id}/assignments`;
onMounted(async()=>{try{await loadMembers();rows.value=await api(base());}catch(e){s.error=e.message;}});
async function save(){await api(base(),{assignments:rows.value},'PUT');notify('Đã lưu phân công.');}
function add(){if(!code.value.trim()||!member.value)return;rows.value.push({code:code.value.trim(),user_id:member.value});code.value='';member.value='';}
</script><template><section class="card stack"><h3>Phân công khách cho thành viên</h3><p class="muted">Ghép mã utm_content hoặc mã nhân viên trong nguồn với thành viên sự kiện. Editor cập nhật khách được phân công; Admin quản lý toàn bộ.</p><div class="grid-form"><label class="field">Mã nhân viên / utm_content<MInput v-model="code"/></label><label class="field">Thành viên<MCombobox v-model="member" :options="s.members.map(m=>({value:m.id,label:m.name+' · '+m.email}))"/></label></div><MButton variant="secondary" @click="add">Thêm phân công</MButton><PagedRecords :rows="rows" v-slot="{rows:pageRows}"><div v-for="row in pageRows" :key="row.code" class="toolbar"><span>{{row.code}} → {{s.members.find(m=>m.id===row.user_id)?.name||'Thành viên đã bị thu hồi quyền'}}</span><MButton variant="link" @click="rows=rows.filter(r=>r!==row)">Bỏ</MButton></div></PagedRecords><MButton variant="primary" :loading="s.busy" @click="run(save)">Lưu phân công</MButton></section></template>
