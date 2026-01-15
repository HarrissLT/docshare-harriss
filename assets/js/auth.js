// assets/js/auth.js
// PHIÊN BẢN: PHÂN QUYỀN MENU (ADMIN vs USER)

document.addEventListener('DOMContentLoaded', () => {
    // 1. XỬ LÝ MENU MOBILE
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeBtn = document.getElementById('closeBtn');
    const navLinks = document.getElementById('navLinks');
    const menuOverlay = document.getElementById('menuOverlay');

    function toggleMenu() {
        if (navLinks && menuOverlay) {
            navLinks.classList.toggle('active');
            menuOverlay.classList.toggle('active');
        }
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleMenu);
    if (closeBtn) closeBtn.addEventListener('click', toggleMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', toggleMenu);
});

// 2. KIỂM TRA USER & PHÂN QUYỀN MENU
async function checkUserStatus() {
    if (!window.supabaseClient) return;

    const { data: { user } } = await window.supabaseClient.auth.getUser();
    
    const desktopAuth = document.getElementById('desktopAuth');
    const mobileAuth = document.getElementById('mobileAuth');
    
    // Lấy các thẻ menu cần ẩn/hiện
    const navUpload = document.getElementById('navUpload');     // Menu Admin
    const navFavorites = document.getElementById('navFavorites'); // Menu User

    // Mặc định ẩn cả 2 trước khi kiểm tra
    if(navUpload) navUpload.style.display = 'none';
    if(navFavorites) navFavorites.style.display = 'none';

    if (user) {
        // --- ĐÃ ĐĂNG NHẬP ---
        
        // Lấy thông tin Role
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        const defaultAvatar = "https://placehold.co/100x100/e2e8f0/64748b?text=User"; 
        const avatarUrl = (profile && profile.avatar_url) ? profile.avatar_url : defaultAvatar;
        const userName = (profile && profile.full_name) ? profile.full_name : "Thành viên";
        
        // Xử lý Role (Cắt khoảng trắng và viết thường để so sánh chuẩn)
        const role = (profile && profile.role) ? profile.role.trim().toLowerCase() : 'user';

        // === LOGIC PHÂN QUYỀN MENU ===
        if (role === 'admin') {
            // Nếu là Admin -> Hiện "Đăng tài liệu"
            if(navUpload) navUpload.style.display = 'block';
        } else {
            // Nếu là User -> Hiện "Yêu thích"
            if(navFavorites) navFavorites.style.display = 'block';
        }

        // Render Auth PC
        if (desktopAuth) {
            desktopAuth.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <a href="profile.html" title="Trang cá nhân">
                        <img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    </a>
                    <button onclick="handleLogout()" class="btn-icon" style="width:35px; height:35px; background:#f3f4f6;" title="Đăng xuất">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            `;
        }

        // Render Auth Mobile
        if (mobileAuth) {
            mobileAuth.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px; padding:15px; background:#f9fafb; border-radius:12px; margin-bottom:10px;">
                    <img src="${avatarUrl}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <div style="font-weight: 600;">${userName}</div>
                        <div style="font-size: 0.8rem; color: #666;">${role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</div>
                    </div>
                </div>
                <button onclick="handleLogout()" class="btn btn-outline" style="width:100%">
                    <i class="fas fa-sign-out-alt"></i> Đăng xuất
                </button>
            `;
        }

    } else {
        // --- CHƯA ĐĂNG NHẬP ---
        // Không hiện menu Upload hay Favorites gì cả (giữ nguyên ẩn)

        if (desktopAuth) {
            desktopAuth.innerHTML = `
                <a href="login.html" class="btn btn-secondary">Đăng nhập</a>
                <a href="register.html" class="btn btn-primary">Đăng ký</a>
            `;
        }

        if (mobileAuth) {
            mobileAuth.innerHTML = `
                <a href="login.html" class="btn btn-secondary" style="text-align:center; display:block; margin-bottom:10px; width:100%">Đăng nhập</a>
                <a href="register.html" class="btn btn-primary" style="text-align:center; display:block; width:100%">Đăng ký ngay</a>
            `;
        }
    }
}

window.handleLogout = async function() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        await window.supabaseClient.auth.signOut();
        window.location.href = "index.html";
    }
};

// Logic Form Đăng ký/Đăng nhập (Giữ nguyên)
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const msgDiv = document.getElementById('message');
        msgDiv.textContent = "Đang xử lý...";
        
        const { error } = await window.supabaseClient.auth.signUp({
            email, password, options: { data: { full_name: fullName } }
        });

        if (error) {
            msgDiv.textContent = "Lỗi: " + error.message;
            msgDiv.className = "message error";
        } else {
            msgDiv.textContent = "Thành công! Đang chuyển hướng...";
            msgDiv.className = "message success";
            setTimeout(() => window.location.href = "index.html", 1500);
        }
    });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const msgDiv = document.getElementById('message');
        msgDiv.textContent = "Đang đăng nhập...";

        const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            msgDiv.textContent = "Sai thông tin đăng nhập!";
            msgDiv.className = "message error";
        } else {
            msgDiv.textContent = "Thành công!";
            msgDiv.className = "message success";
            setTimeout(() => window.location.href = "index.html", 1000);
        }
    });
}

checkUserStatus();