// assets/js/config.js

// Thông tin kết nối Supabase của bạn
const SUPABASE_URL = 'https://sfeybvebqeeuhzzkxeaf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GlIYUSy6IR5Cy1x0rR4SvA_pDg5p-FJ'; // Chỉ dùng Publishable Key

// Kiểm tra xem thư viện đã load chưa
if (typeof supabase === 'undefined') {
    console.error("Lỗi: Chưa load thư viện Supabase trong file HTML!");
} else {
    // Khởi tạo kết nối
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Connected Successfully!");
}