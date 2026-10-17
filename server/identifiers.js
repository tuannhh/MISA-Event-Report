// Preserve text; repair only unambiguous Vietnamese lengths. Never pad foreign numbers.
export function phoneText(value){
 const text=String(value??'').trim(),digits=text.replace(/[\s().-]/g,'');
 if(/^(?:\+84|0084|84)[35789]\d{8}$/.test(digits))return '0'+digits.replace(/^(?:\+84|0084|84)/,'');
 if(/^[35789]\d{8}$/.test(digits)||/^2\d{9}$/.test(digits))return '0'+digits;
 return /^0\d{9,10}$/.test(digits)?digits:text;
}
export function taxText(value){
 const text=String(value??'').trim();
 if(/^\d{9}$/.test(text)||/^\d{9}-\d{3}$/.test(text)||/^\d{12}$/.test(text))return '0'+text;
 return text;
}
export const identifiers=row=>({...row,phone:phoneText(row.phone),tax_id:taxText(row.tax_id)});
