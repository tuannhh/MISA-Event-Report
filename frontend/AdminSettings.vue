<script setup>
import {ref,onMounted} from 'vue';
import {s,api,run,showEventList} from './store';
import BrandLogo from './BrandLogo.vue';
import PagedRecords from './PagedRecords.vue';
import MMobileTopBar from './mobile/MMobileTopBar.vue';
import {currentHeaderMode} from './mds/theme-state';
defineProps({mobile:Boolean});
const rows=ref([]),adding=ref(false),removing=ref(false),selected=ref(null),name=ref(''),email=ref('');
async function load(){rows.value=await api('/api/admins');}
async function save(){await api('/api/admins',{name:name.value,email:email.value});adding.value=false;name.value=email.value='';await load();}
async function remove(){await api('/api/admins/'+selected.value.id,null,'DELETE');removing.value=false;await load();}
onMounted(()=>load().catch(e=>s.error=e.message));
const columns=[{key:'name',label:'Họ và tên'},{key:'email',label:'Email'},{key:'scope',label:'Phạm vi'},{key:'actions',label:'Thao tác',width:160}];
</script>
<template><div class="relative flex h-full flex-col overflow-hidden" :class="{'mds-mobile-app':mobile}">
<MMobileTopBar v-if="mobile" title="Thiết lập thành viên" @back="run(()=>showEventList())"/>
<MHeaderBar v-else class="shrink-0" app-name="Event Report" :variant="currentHeaderMode" :user="s.user" :show-assistant="false" :show-chat="false" :show-notifications="false" :show-help="false" :show-more="false" :show-whats-new="false" @settings="s.appearance=true" @user-click="s.dialog='account'" @logo-click="run(()=>showEventList())" @app-switcher="run(()=>showEventList())"><template #logo><BrandLogo/></template><template #search><span/></template></MHeaderBar>
<main class="scroll-region page-body stack"><div class="toolbar"><div><MButton v-if="!mobile" variant="link" @click="run(()=>showEventList())">Về danh sách sự kiện</MButton><h1 v-if="!mobile">Thiết lập thành viên</h1><p class="muted">Admin quản lý toàn bộ sự kiện. Thành viên Editor được thêm riêng trong từng sự kiện.</p></div><MButton variant="primary" @click="adding=true">Thêm Admin</MButton></div>
<p v-if="s.error" class="error" role="alert">{{s.error}}</p><PagedRecords :rows="rows" v-slot="{rows:pageRows}"><div v-if="mobile" class="card mobile-list"><article v-for="row in pageRows" :key="row.id"><h3>{{row.name}}</h3><p>{{row.email}}</p><p class="muted">Toàn bộ sự kiện</p><MButton variant="link" @click="selected=row;removing=true">Xóa Admin</MButton></article></div><MDataTable v-else :columns="columns" :rows="pageRows" :pagination="false"><template #cell-scope>Toàn bộ sự kiện</template><template #cell-actions="{row}"><MButton variant="link" @click="selected=row;removing=true">Xóa Admin</MButton></template></MDataTable><MEmptyState v-if="!rows.length" type="initial" title="Chưa có Admin"/></PagedRecords></main>
<MDialog v-model="adding" title="Thêm Admin" :presentation="mobile?'sheet':'dialog'" :width="560"><form id="admin-form" class="stack" @submit.prevent="run(save)"><p v-if="s.error" class="error" role="alert">{{s.error}}</p><label class="field">Họ và tên<MInput v-model="name"/></label><label class="field">Email MISA<MInput v-model="email" type="email"/></label><p class="muted">Được quản lý toàn bộ sự kiện. Tài khoản mới cần đổi mật khẩu lần đầu.</p></form><template #footer><MButton variant="secondary" @click="adding=false">Hủy</MButton><MButton variant="primary" form="admin-form" type="submit" :loading="s.busy">Thêm Admin</MButton></template></MDialog>
<MDialog v-model="removing" title="Xóa quyền Admin" :presentation="mobile?'sheet':'dialog'" :width="560"><div class="stack"><p v-if="s.error" class="error" role="alert">{{s.error}}</p><p>Thu hồi quyền Admin của {{selected?.name}} ({{selected?.email}})?</p><p class="muted">Tài khoản và lịch sử được giữ lại. Quyền thành viên đã cấp riêng trong từng sự kiện vẫn giữ nguyên.</p></div><template #footer><MButton variant="secondary" @click="removing=false">Hủy</MButton><MButton variant="primary" :loading="s.busy" @click="run(remove)">Thu hồi quyền Admin</MButton></template></MDialog>
</div></template>
