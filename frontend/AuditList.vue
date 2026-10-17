<script setup>
import {ref,watch,onBeforeUnmount} from 'vue';
import {api,dateText} from './store';
import ListPager from './ListPager.vue';
const props=defineProps({eventId:{type:String,required:true}});
const rows=ref([]),total=ref(0),page=ref(1),pageSize=ref(20),loading=ref(false),error=ref('');
let request=0;
async function load(){
 const seq=++request;loading.value=true;error.value='';rows.value=[];
 try{const result=await api(`/api/events/${props.eventId}/audit?page=${page.value}&pageSize=${pageSize.value}`);if(seq!==request)return;rows.value=result.rows;total.value=result.total;page.value=result.page;}
 catch(e){if(seq===request){error.value=e.message;total.value=0;}}
 finally{if(seq===request)loading.value=false;}
}
watch(()=>props.eventId,()=>{page.value=1;void load();},{immediate:true});
onBeforeUnmount(()=>request++);
function go(value){page.value=value;void load();}
</script>
<template><section class="card stack"><p v-if="error" role="alert" class="error">{{error}}</p><div v-if="loading" role="status">Đang tải nhật ký…</div><div v-else class="mobile-list"><article v-for="a in rows" :key="a.id">{{dateText(a.created_at)}} · {{a.name}} · {{a.action}}</article><p v-if="!rows.length&&!error" class="muted">Chưa có nhật ký.</p></div><ListPager :page="page" :page-size="pageSize" :total="total" :loading="loading" @update:page-size="pageSize=$event" @update:page="go"/><MButton v-if="error" variant="secondary" @click="load">Thử lại</MButton></section></template>
