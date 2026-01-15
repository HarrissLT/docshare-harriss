// assets/js/admin.js

// 1. HÀM XỬ LÝ TÊN FILE
function sanitizeFilename(name) {
    return name.normalize('NFD')
               .replace(/[\u0300-\u036f]/g, '')
               .replace(/đ/g, 'd').replace(/Đ/g, 'D')
               .replace(/\s+/g, '-')
               .replace(/[^a-zA-Z0-9.-]/g, '')
               .toLowerCase();
}

// 2. KIỂM TRA QUYỀN ADMIN (Đã nâng cấp để báo lỗi rõ hơn)
// assets/js/admin.js

async function checkAdmin() {
    console.log("Đang kiểm tra quyền Admin...");

    // A. Kiểm tra đăng nhập
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        alert("Bạn chưa đăng nhập! Vui lòng đăng nhập để tiếp tục.");
        window.location.href = 'login.html';
        return;
    }

    // B. Kiểm tra Role trong Database
    const { data: profile, error } = await window.supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error) {
        alert("Lỗi kết nối: " + error.message);
        window.location.href = 'index.html';
        return;
    }

    // --- ĐOẠN SỬA QUAN TRỌNG Ở ĐÂY ---
    // Lấy role, cắt khoảng trắng thừa (trim), và chuyển về chữ thường
    const userRole = profile && profile.role ? profile.role.trim().toLowerCase() : '';

    if (userRole !== 'admin') {
        // In ra để debug xem nó đang là gì
        console.log("Role hiện tại:", userRole); 
        alert(`Truy cập bị từ chối! Tài khoản của bạn là: "${userRole}". Chỉ "admin" mới được vào.`);
        window.location.href = 'index.html';
    } else {
        console.log("Chào mừng Admin!");
        // Không làm gì cả, cho phép ở lại trang
    }
}
// Chạy hàm kiểm tra ngay lập tức
checkAdmin();

// --- CÁC PHẦN DƯỚI GIỮ NGUYÊN ---

document.getElementById('thumbFile').addEventListener('change', function() {
    if(this.files[0]) document.getElementById('thumbName').textContent = this.files[0].name;
});
document.getElementById('docFile').addEventListener('change', function() {
    if(this.files[0]) document.getElementById('docName').textContent = this.files[0].name;
});

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg');
    const btn = e.target.querySelector('button');
    
    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    const price = document.getElementById('price').value;
    const desc = document.getElementById('description').value;
    const thumbFile = document.getElementById('thumbFile').files[0];
    const docFile = document.getElementById('docFile').files[0];

    if (!thumbFile || !docFile) {
        msg.textContent = "Vui lòng chọn đủ Ảnh bìa và File tài liệu!";
        msg.className = "message error";
        return;
    }

    try {
        msg.textContent = "Đang upload file... Vui lòng chờ!";
        msg.className = "message";
        btn.disabled = true;
        btn.textContent = "Đang xử lý...";

        const timeStamp = Date.now();

        // Upload Ảnh
        const cleanThumbName = sanitizeFilename(thumbFile.name);
        const thumbPath = `thumb_${timeStamp}_${cleanThumbName}`;
        const { error: errThumb } = await window.supabaseClient.storage.from('images').upload(thumbPath, thumbFile);
        if (errThumb) throw errThumb;
        const { data: { publicUrl: thumbUrl } } = window.supabaseClient.storage.from('images').getPublicUrl(thumbPath);

        // Upload PDF
        const cleanDocName = sanitizeFilename(docFile.name);
        const docPath = `doc_${timeStamp}_${cleanDocName}`;
        const { error: errDoc } = await window.supabaseClient.storage.from('files').upload(docPath, docFile);
        if (errDoc) throw errDoc;
        const { data: { publicUrl: docUrl } } = window.supabaseClient.storage.from('files').getPublicUrl(docPath);

        // Lưu DB
        const { error: errDb } = await window.supabaseClient.from('documents').insert({
            title: title,
            description: desc,
            price: parseInt(price),
            category: category,
            thumbnail_url: thumbUrl,
            file_url: docUrl
        });

        if (errDb) throw errDb;

        msg.textContent = "Đăng tài liệu thành công! Đang về trang chủ...";
        msg.className = "message success";
        
        document.getElementById('uploadForm').reset();
        
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1500);

    } catch (error) {
        console.error(error);
        msg.textContent = "Lỗi: " + error.message;
        msg.className = "message error";
    } finally {
        btn.disabled = false;
        btn.textContent = "Đăng tài liệu";
    }
});