import React, { useState } from 'react';
import { jobs, departments, getJobsByDepartment } from '../data/jobs';
import { useNotification } from '../context/NotificationContext';
import './CareersPage.css';

const initialFormData = {
  name: '',
  birthdate: '',
  email: '',
  phone: '',
  introduction: '',
  video: null,
  cv: null
};

const CareersPage = () => {
  const { success } = useNotification();
  const [selectedDepartment, setSelectedDepartment] = useState('Tất cả phòng ban');
  const [filteredJobs, setFilteredJobs] = useState(jobs);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const handleDepartmentChange = (department) => {
    setSelectedDepartment(department);
    setFilteredJobs(getJobsByDepartment(department));
  };

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setShowApplicationForm(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseForm = () => {
    setShowApplicationForm(false);
    setSelectedJob(null);
    setFormData(initialFormData);
    document.body.style.overflow = 'unset';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // TODO: Implement API call to submit application
    const applicationData = {
      jobId: selectedJob.id,
      jobTitle: selectedJob.title,
      ...formData
    };
    
    success('Đơn ứng tuyển của bạn đã được gửi thành công!');
    handleCloseForm();
  };

  return (
    <div className="careers-page">
      {/* Hero Banner */}
      <div className="careers-hero">
        <div className="careers-hero-overlay">
          <h1 className="careers-hero-title">Phát triển cùng TechZone</h1>
          <p className="careers-hero-description">
            TechZone tin rằng con người là cốt lõi của bền vững trong doanh nghiệp, 
            chúng tôi luôn quan tâm đến quá trình phát triển nghề nghiệp của bạn. 
            TechZone theo đuổi môi trường làm việc sáng tạo, có xát và nhiều cơ hội thăng tiến. 
            Mỗi nhân viên đều được trao cơ hội như nhau.
          </p>
          <p className="careers-hero-subtitle">
            Dù xuất phát điểm của bạn như thế nào, miễn là bạn có nhiệt huyệt, 
            khát khao học hỏi và mong muốn thay đổi bản thân, TechZone sẽ luôn đồng hành cùng bạn.
          </p>
          <p className="careers-hero-brand">
            TechZone là một thương hiệu của Sieutoc.
          </p>
          <button className="careers-hero-button">Danh sách Jobs</button>
        </div>
      </div>

      {/* Jobs Section */}
      <div className="careers-content">
        {/* Sidebar - Departments */}
        <aside className="careers-sidebar">
          <div className="departments-header">Tất cả phòng ban</div>
          <ul className="departments-list">
            {departments.map((dept) => (
              <li
                key={dept}
                className={`department-item ${selectedDepartment === dept ? 'active' : ''}`}
                onClick={() => handleDepartmentChange(dept)}
              >
                {dept}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main Content - Job Listings */}
        <main className="careers-main">
          {filteredJobs.length === 0 ? (
            <div className="no-jobs">
              <p>Hiện tại không có vị trí tuyển dụng nào trong phòng ban này.</p>
            </div>
          ) : (
            <div className="jobs-list">
              {filteredJobs.map((job) => (
                <div key={job.id} className="job-card">
                  <div className="job-card-header">
                    <h3 className="job-title">{job.title}</h3>
                    <span className="job-openings">
                      {job.openings} vị trí đang tuyển
                    </span>
                  </div>
                  
                  <div className="job-details">
                    <div className="job-detail-item">
                      <span className="job-icon">📍</span>
                      <div className="job-location">
                        <div className="location-short">{job.location}</div>
                        <div className="location-full">{job.fullLocation}</div>
                      </div>
                    </div>
                    
                    <div className="job-detail-item">
                      <span className="job-icon">🕐</span>
                      <span className="job-date">{job.postedDate}</span>
                    </div>
                  </div>

                  <div className="job-description">
                    <p>{job.description}</p>
                  </div>

                  <div className="job-requirements">
                    <strong>Yêu cầu:</strong>
                    <ul>
                      {job.requirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>

                  <button 
                    className="job-apply-button"
                    onClick={() => handleApplyClick(job)}
                  >
                    Ứng tuyển ngay
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Application Form Modal */}
      {showApplicationForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="application-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseForm}>×</button>
            
            <div className="application-header">
              <div className="breadcrumb">
                Tuyển dụng / {selectedJob?.title}
              </div>
              <h2 className="form-title">Biểu mẫu ứng tuyển</h2>
              <h3 className="form-subtitle">{selectedJob?.title}</h3>
            </div>

            <form className="application-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  Tên <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>
                  Ngày sinh <span className="required">*</span>
                </label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>
                  Số điện thoại <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Giới thiệu ngắn</label>
                <textarea
                  name="introduction"
                  value={formData.introduction}
                  onChange={handleInputChange}
                  rows="4"
                  className="form-textarea"
                  placeholder="Viết vài dòng giới thiệu về bản thân..."
                />
              </div>

              <div className="form-group">
                <label>Video ngắn giới thiệu bản thân ~30s</label>
                <input
                  type="file"
                  name="video"
                  onChange={handleFileChange}
                  accept="video/*"
                  className="form-file-input"
                />
                <div className="file-hint">
                  {formData.video ? formData.video.name : 'Không có tệp nào được chọn'}
                </div>
              </div>

              <div className="form-group">
                <label>
                  CV + Portfolio <span className="required">*</span>
                </label>
                <input
                  type="file"
                  name="cv"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  required
                  className="form-file-input"
                />
                <div className="file-hint">
                  {formData.cv ? formData.cv.name : 'Không có tệp nào được chọn'}
                </div>
              </div>

              <button type="submit" className="form-submit-button">
                Gửi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareersPage;

