import React, { useState, useEffect } from 'react';
import { ExternalLink, Save, Check, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

export const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || 'Nguyen Cong Quan',
    class: user?.class || 'D21CQCN01-B',
    studentId: user?.studentId || 'B21DCCN000',
    email: user?.email || 'nguyencongquan@iot.local',
    github: user?.github || 'https://github.com/nguyencongquan',
    figma: user?.figma || '',
    postman: user?.postman || '',
    pdf: user?.pdf || ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tự động đồng bộ form khi dữ liệu user từ Backend được tải về
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.username || 'Nguyen Cong Quan',
        class: user.class || 'D21CQCN01-B',
        studentId: user.studentId || 'B21DCCN000',
        email: user.email || 'nguyencongquan@iot.local',
        github: user.github || 'https://github.com/nguyencongquan',
        figma: user.figma || '',
        postman: user.postman || '',
        pdf: user.pdf || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await updateProfile(formData);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="profile-page">
      {/* Page Title */}
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>

      {/* Main Profile Card matching GiaoDienProfile.png */}
      <div className="profile-card">
        {/* Top Header: Avatar & Name */}
        <div className="profile-header-area">
          <div className="profile-avatar-circle">
            <span className="avatar-text">PHOTO</span>
          </div>

          <div className="profile-title-block">
            <h2 className="profile-display-name">{formData.fullName}</h2>
            <div className="profile-class-badge">
              <span>CLASS: {formData.class}</span>
            </div>
          </div>
        </div>

        <div className="profile-divider" />

        {/* Profile Form / Details Grid */}
        <form onSubmit={handleSave} className="profile-form">
          <div className="profile-grid">
            {/* FULL NAME */}
            <div className="profile-field">
              <label className="field-label">FULL NAME</label>
              <input
                type="text"
                name="fullName"
                className={`field-input ${!isEditing ? 'readonly' : ''}`}
                value={formData.fullName}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            {/* CLASS */}
            <div className="profile-field">
              <label className="field-label">CLASS</label>
              <input
                type="text"
                name="class"
                className={`field-input ${!isEditing ? 'readonly' : ''}`}
                value={formData.class}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            {/* STUDENT ID */}
            <div className="profile-field">
              <label className="field-label">STUDENT ID</label>
              <input
                type="text"
                name="studentId"
                className={`field-input ${!isEditing ? 'readonly' : ''}`}
                value={formData.studentId}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            {/* MAIL */}
            <div className="profile-field">
              <label className="field-label">MAIL</label>
              <input
                type="email"
                name="email"
                className={`field-input ${!isEditing ? 'readonly' : ''}`}
                value={formData.email}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            {/* GITHUB */}
            <div className="profile-field">
              <label className="field-label">GITHUB</label>
              <div className="link-field-wrapper">
                <input
                  type="text"
                  name="github"
                  className={`field-input ${!isEditing ? 'readonly' : ''} text-cyan-link`}
                  value={formData.github}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                {!isEditing && formData.github && (
                  <a href={formData.github} target="_blank" rel="noreferrer" className="link-ext-icon">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* FIGMA */}
            <div className="profile-field">
              <label className="field-label">FIGMA</label>
              <div className="link-field-wrapper">
                <input
                  type="text"
                  name="figma"
                  className={`field-input ${!isEditing ? 'readonly' : ''} text-cyan-link`}
                  value={formData.figma}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                {!isEditing && formData.figma && (
                  <a href={formData.figma} target="_blank" rel="noreferrer" className="link-ext-icon">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* POSTMAN */}
            <div className="profile-field">
              <label className="field-label">POSTMAN</label>
              <div className="link-field-wrapper">
                <input
                  type="text"
                  name="postman"
                  className={`field-input ${!isEditing ? 'readonly' : ''} text-cyan-link`}
                  value={formData.postman}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                {!isEditing && formData.postman && (
                  <a href={formData.postman} target="_blank" rel="noreferrer" className="link-ext-icon">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* PDF */}
            <div className="profile-field">
              <label className="field-label">PDF</label>
              <div className="link-field-wrapper">
                <input
                  type="text"
                  name="pdf"
                  className={`field-input ${!isEditing ? 'readonly' : ''} text-cyan-link`}
                  value={formData.pdf}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                {!isEditing && formData.pdf && (
                  <a href={formData.pdf} target="_blank" rel="noreferrer" className="link-ext-icon">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action button at bottom right matching GiaoDienProfile.png */}
          <div className="profile-actions-row">
            {saveSuccess && (
              <div className="save-toast">
                <Check size={16} />
                <span>Đã lưu thông tin hồ sơ thành công!</span>
              </div>
            )}

            {isEditing ? (
              <div className="edit-btn-group">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsEditing(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-cyan">
                  <Save size={16} />
                  <span>LƯU HỒ SƠ</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-cyan edit-profile-btn"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 size={15} />
                <span>EDIT PROFILE</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
