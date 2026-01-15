// assets/js/profile.js

const userMsg = document.getElementById('msg');

// 1. Load thông tin khi vào trang
async function loadProfile() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Lấy data từ bảng profiles
    const { data: profile, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile) {
        document.getElementById('displayName').textContent = profile.full_name || "Chưa đặt tên";
        document.getElementById('fullNameInput').value = profile.full_name || "";
        document.getElementById('displayEmail').textContent = profile.email;
        document.getElementById('displayRole').textContent = profile.role === 'admin' ? 'Quản trị viên' : 'Thành viên';
        
        if (profile.avatar_url) {
            document.getElementById('currentAvatar').src = profile.avatar_url;
        }
    }
}

// 2. Xử lý đổi tên
document.getElementById('updateProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('fullNameInput').value;
    const { data: { user } } = await window.supabaseClient.auth.getUser();

    userMsg.textContent = "Đang lưu...";
    
    const { error } = await window.supabaseClient
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', user.id);

    if (!error) {
        userMsg.textContent = "Cập nhật thành công!";
        userMsg.className = "message success";
        loadProfile(); // Load lại để cập nhật hiển thị
    } else {
        userMsg.textContent = "Lỗi: " + error.message;
    }
});

// 3. Xử lý Upload Avatar
document.getElementById('avatarInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const { data: { user } } = await window.supabaseClient.auth.getUser();
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    userMsg.textContent = "Đang tải ảnh lên...";

    // A. Upload file vào Storage 'avatars'
    const { error: uploadError } = await window.supabaseClient
        .storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) {
        alert("Lỗi upload: " + uploadError.message);
        return;
    }

    // B. Lấy link public
    const { data: { publicUrl } } = window.supabaseClient
        .storage
        .from('avatars')
        .getPublicUrl(filePath);

    // C. Lưu link vào bảng profiles
    const { error: updateError } = await window.supabaseClient
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

    if (!updateError) {
        document.getElementById('currentAvatar').src = publicUrl; // Hiện ngay lập tức
        userMsg.textContent = "Đổi avatar thành công!";
        userMsg.className = "message success";
    }
});

// 4. Xử lý đổi mật khẩu
document.getElementById('changePassForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('newPassword').value;
    
    userMsg.textContent = "Đang đổi mật khẩu...";
    
    const { error } = await window.supabaseClient.auth.updateUser({
        password: newPass
    });

    if (!error) {
        userMsg.textContent = "Đổi mật khẩu thành công!";
        userMsg.className = "message success";
        document.getElementById('newPassword').value = "";
    } else {
        userMsg.textContent = "Lỗi: " + error.message;
        userMsg.className = "message error";
    }
});

// Chạy hàm load khi mở trang
loadProfile();