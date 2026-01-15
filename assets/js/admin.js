// assets/js/admin.js
// PHIÊN BẢN HOÀN CHỈNH: UPLOAD ĐA NĂNG, CHECK QUYỀN, XỬ LÝ ẢNH DEMO

document.addEventListener('DOMContentLoaded', () => {

    // ================================================================
    // 1. HÀM TIỆN ÍCH: CHUYỂN TÊN FILE VỀ DẠNG AN TOÀN
    // ================================================================
    function sanitizeFilename(name) {
        return name.normalize('NFD')
                   .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
                   .replace(/đ/g, 'd').replace(/Đ/g, 'D')
                   .replace(/\s+/g, '-') // Chuyển khoảng trắng thành gạch ngang
                   .replace(/[^a-zA-Z0-9.-]/g, '') // Bỏ ký tự đặc biệt
                   .toLowerCase(); // Chuyển về chữ thường
    }

    // ================================================================
    // 2. KIỂM TRA QUYỀN ADMIN (BẢO MẬT)
    // ================================================================
    async function checkAdmin() {
        // Kiểm tra xem Supabase đã load chưa
        if (!window.supabaseClient) {
            console.error("Supabase chưa load!");
            return;
        }

        const { data: { user } } = await window.supabaseClient.auth.getUser();
        
        if (!user) {
            alert("Vui lòng đăng nhập tài khoản Admin!");
            window.location.href = 'login.html';
            return;
        }

        // Lấy role từ bảng profiles
        const { data: profile, error } = await window.supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            alert("Lỗi kiểm tra quyền hạn. Vui lòng thử lại.");
            window.location.href = 'index.html';
            return;
        }

        // Xử lý chuỗi role (cắt khoảng trắng, chuyển thường)
        const role = profile.role ? profile.role.trim().toLowerCase() : '';

        if (role !== 'admin') {
            alert("Truy cập bị từ chối! Bạn không phải là Admin.");
            window.location.href = 'index.html';
        } else {
            console.log("Đã xác thực quyền Admin.");
        }
    }

    // Chạy kiểm tra ngay khi vào trang
    checkAdmin();

    // ================================================================
    // 3. XỬ LÝ GIAO DIỆN CHỌN FILE
    // ================================================================
    
    // Hiển thị tên Ảnh bìa
    const thumbInput = document.getElementById('thumbFile');
    if (thumbInput) {
        thumbInput.addEventListener('change', function() {
            if(this.files[0]) document.getElementById('thumbName').textContent = this.files[0].name;
        });
    }

    // Hiển thị tên File tài liệu
    const docInput = document.getElementById('docFile');
    if (docInput) {
        docInput.addEventListener('change', function() {
            if(this.files[0]) document.getElementById('docName').textContent = this.files[0].name;
        });
    }

    // Hiển thị số lượng Ảnh Demo
    const demoInput = document.getElementById('demoFiles');
    if (demoInput) {
        demoInput.addEventListener('change', function() {
            if(this.files.length > 0) {
                document.getElementById('demoNames').textContent = `Đã chọn ${this.files.length} ảnh`;
            } else {
                document.getElementById('demoNames').textContent = "Chọn các trang demo...";
            }
        });
    }

    // ================================================================
    // 4. XỬ LÝ UPLOAD & ĐĂNG BÀI (MAIN LOGIC)
    // ================================================================
    const uploadForm = document.getElementById('uploadForm');
    
    if (uploadForm) {
uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const msg = document.getElementById('msg');
            // Sửa lại dòng này để tìm đúng ID vừa đặt
            const btn = document.getElementById('btnUpload') || e.target.querySelector('button');            
            // Lấy dữ liệu từ Form
            const title = document.getElementById('title').value;
            const category = document.getElementById('category').value;
            const price = document.getElementById('price').value;
            const desc = document.getElementById('description').value;
            
            const thumbFile = thumbInput.files[0];
            const docFile = docInput.files[0];
            const demoFiles = demoInput ? demoInput.files : []; // Lấy danh sách ảnh demo

            // Validate cơ bản
            if (!thumbFile || !docFile) {
                msg.textContent = "Vui lòng chọn đủ Ảnh bìa và File tài liệu!";
                msg.className = "message error";
                return;
            }

            try {
                // Bắt đầu xử lý -> Khóa nút bấm
                msg.textContent = "Đang upload dữ liệu... Vui lòng không tắt tab.";
                msg.className = "message";
                btn.disabled = true;
                btn.textContent = "Đang xử lý...";

                const timeStamp = Date.now();

                // --- BƯỚC A: UPLOAD ẢNH BÌA ---
                const cleanThumbName = sanitizeFilename(thumbFile.name);
                const thumbPath = `thumb_${timeStamp}_${cleanThumbName}`;
                
                const { error: errThumb } = await window.supabaseClient.storage.from('images').upload(thumbPath, thumbFile);
                if (errThumb) throw new Error("Lỗi upload ảnh bìa: " + errThumb.message);
                
                const { data: { publicUrl: thumbUrl } } = window.supabaseClient.storage.from('images').getPublicUrl(thumbPath);

                // --- BƯỚC B: UPLOAD FILE TÀI LIỆU ---
                const cleanDocName = sanitizeFilename(docFile.name);
                const docPath = `doc_${timeStamp}_${cleanDocName}`;
                
                const { error: errDoc } = await window.supabaseClient.storage.from('files').upload(docPath, docFile);
                if (errDoc) throw new Error("Lỗi upload tài liệu: " + errDoc.message);

                const { data: { publicUrl: docUrl } } = window.supabaseClient.storage.from('files').getPublicUrl(docPath);

                // --- BƯỚC C: UPLOAD ẢNH DEMO (NẾU CÓ) ---
                let demoUrls = [];
                if (demoFiles.length > 0) {
                    msg.textContent = `Đang upload ${demoFiles.length} ảnh demo...`;
                    
                    for (let i = 0; i < demoFiles.length; i++) {
                        const file = demoFiles[i];
                        const cleanName = sanitizeFilename(file.name);
                        const path = `demo_${timeStamp}_${i}_${cleanName}`;
                        
                        // Upload từng ảnh vào bucket 'images'
                        const { error: errDemo } = await window.supabaseClient.storage.from('images').upload(path, file);
                        
                        if (!errDemo) {
                            const { data: { publicUrl } } = window.supabaseClient.storage.from('images').getPublicUrl(path);
                            demoUrls.push(publicUrl);
                        } else {
                            console.warn("Lỗi upload ảnh demo số " + i, errDemo);
                        }
                    }
                }

                // --- BƯỚC D: LƯU VÀO DATABASE ---
                msg.textContent = "Đang lưu thông tin...";
                
                const { error: errDb } = await window.supabaseClient.from('documents').insert({
                    title: title,
                    description: desc,
                    price: parseInt(price),
                    category: category,
                    thumbnail_url: thumbUrl,
                    file_url: docUrl,
                    demo_urls: demoUrls // Lưu mảng link ảnh demo
                });

                if (errDb) throw new Error("Lỗi lưu Database: " + errDb.message);

                // --- HOÀN TẤT ---
                msg.textContent = "Đăng tài liệu thành công! Đang chuyển hướng...";
                msg.className = "message success";
                uploadForm.reset();
                
                // Reset text hiển thị file
                document.getElementById('thumbName').textContent = "Chọn ảnh...";
                document.getElementById('docName').textContent = "Chọn file...";
                if(document.getElementById('demoNames')) document.getElementById('demoNames').textContent = "Chọn các trang demo...";
                
                // Chuyển về trang chủ sau 1.5s
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);

            } catch (error) {
                console.error(error);
                msg.textContent = error.message;
                msg.className = "message error";
                btn.disabled = false;
                btn.textContent = "Đăng tài liệu";
            }
        });
    }
});