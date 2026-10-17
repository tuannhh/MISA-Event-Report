import {computed,ref,watch,toValue} from 'vue';
export const PAGE_SIZES=Object.freeze([20,50,100]);
export function usePagination(source,all=()=>false){
 const page=ref(1),pageSize=ref(20);
 const rows=computed(()=>toValue(source)||[]);
 const lastPage=computed(()=>Math.max(1,Math.ceil(rows.value.length/pageSize.value)));
 watch(()=>JSON.stringify(rows.value),()=>{page.value=1;},{flush:'sync'});
 watch(pageSize,()=>{page.value=1;},{flush:'sync'});
 const currentPage=computed(()=>Math.max(1,Math.min(page.value,lastPage.value)));
 const visibleRows=computed(()=>toValue(all)?rows.value:rows.value.slice((currentPage.value-1)*pageSize.value,currentPage.value*pageSize.value));
 return {page:currentPage,pageSize,visibleRows,total:computed(()=>rows.value.length),setPage:value=>{page.value=Math.max(1,Math.min(Number(value)||1,lastPage.value));},setPageSize:value=>{if(PAGE_SIZES.includes(Number(value)))pageSize.value=Number(value);}};
}
