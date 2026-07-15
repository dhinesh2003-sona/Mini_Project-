import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Modal,
  Table,
  Badge,
  Card,
  ProgressBar,
  Alert,
  Spinner,
  Navbar,
  Nav
} from 'react-bootstrap';
import './App.css';

// Demo student data for simulation
const DEMO_STUDENTS = [
  { name: 'Dhinesh M',       id: 'MCA001', baseConf: 0.94 },
  { name: 'Priya R',         id: 'MCA002', baseConf: 0.87 },
  { name: 'Arjun K',         id: 'MCA003', baseConf: 0.91 },
  { name: 'Sneha V',         id: 'MCA004', baseConf: 0.78 },
  { name: 'Karthik S',       id: 'MCA005', baseConf: 0.85 },
  { name: 'Lakshmi N',       id: 'MCA006', baseConf: 0.96 },
  { name: 'Rahul P',         id: 'MCA007', baseConf: 0.72 },
  { name: 'Anitha D',        id: 'MCA008', baseConf: 0.89 },
  { name: 'Vijay T',         id: 'MCA009', baseConf: 0.83 },
  { name: 'Meena B',         id: 'MCA010', baseConf: 0.93 },
];

function App() {
  const [cameraStarted, setCameraStarted]   = useState(false);
  const [attendance, setAttendance]         = useState([]);
  const [stats, setStats]                   = useState({
    attendance_count: 0,
    stats: {
      successful_recognitions: 0,
      faces_detected: 0,
      total_frames: 0,
      failed_recognitions: 0,
      no_faces_detected: 0,
    },
  });
  const [showModal, setShowModal]           = useState(false);
  const [selectedEntry, setSelectedEntry]   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [systemStatus, setSystemStatus]     = useState('inactive');
  const [cloudStatus, setCloudStatus]       = useState('connected');
  const [demoFrame, setDemoFrame]           = useState(0);
  const studentIndexRef                     = useRef(0);
  const frameCountRef                       = useRef(0);

  // Simulate live stats when camera is running
  useEffect(() => {
    let interval;
    if (cameraStarted) {
      setSystemStatus('active');
      setCloudStatus('connected');

      interval = setInterval(() => {
        frameCountRef.current += 1;
        setDemoFrame(f => f + 1); // trigger re-render for frame counter

        // Every 4 seconds, add a new attendance entry
        if (frameCountRef.current % 4 === 0) {
          const idx = studentIndexRef.current % DEMO_STUDENTS.length;
          const student = DEMO_STUDENTS[idx];
          const conf = Math.min(
            0.99,
            student.baseConf + (Math.random() * 0.06 - 0.03)
          );

          // Only add if not already marked today
          setAttendance(prev => {
            const alreadyPresent = prev.some(e => e.id === student.id);
            if (alreadyPresent) return prev;
            const newEntry = {
              name: student.name,
              id: student.id,
              timestamp: new Date().toISOString(),
              confidence: parseFloat(conf.toFixed(3)),
            };
            return [newEntry, ...prev];
          });

          studentIndexRef.current += 1;
        }

        // Update rolling stats
        setStats(prev => {
          const frames = frameCountRef.current;
          const successful = Math.floor(frames * 0.82);
          const failed     = Math.floor(frames * 0.18);
          return {
            attendance_count: prev.attendance_count,
            stats: {
              total_frames:           frames,
              faces_detected:         Math.floor(frames * 0.75),
              successful_recognitions: successful,
              failed_recognitions:    failed,
              no_faces_detected:      Math.floor(frames * 0.25),
            },
          };
        });
      }, 1000);
    } else {
      // Camera stopped
      if (systemStatus !== 'inactive') setSystemStatus('inactive');
    }

    return () => clearInterval(interval);
  }, [cameraStarted]);

  // Keep attendance_count in sync
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      attendance_count: attendance.length,
    }));
  }, [attendance]);

  const startCamera = () => {
    setLoading(true);
    setTimeout(() => {
      setCameraStarted(true);
      setLoading(false);
      frameCountRef.current = 0;
    }, 1200);
  };

  const stopCamera = () => {
    setCameraStarted(false);
    setSystemStatus('inactive');
  };

  const clearAttendance = () => {
    if (window.confirm('Are you sure you want to clear all attendance records?')) {
      setAttendance([]);
      frameCountRef.current = 0;
      studentIndexRef.current = 0;
      setStats({
        attendance_count: 0,
        stats: {
          successful_recognitions: 0,
          faces_detected: 0,
          total_frames: 0,
          failed_recognitions: 0,
          no_faces_detected: 0,
        },
      });
    }
  };

  const openModal  = entry => { setSelectedEntry(entry); setShowModal(true); };
  const closeModal = ()    => { setShowModal(false); setSelectedEntry(null); };

  const getStatusIndicator = status => {
    switch (status) {
      case 'active':  return <div className="status-indicator status-active"></div>;
      case 'error':   return <div className="status-indicator status-inactive"></div>;
      default:        return <div className="status-indicator status-warning"></div>;
    }
  };

  const getCloudStatusText = status => {
    switch (status) {
      case 'connected':   return 'Connected';
      case 'available':   return 'Available (Not Configured)';
      case 'unavailable': return 'Not Available';
      case 'error':       return 'Connection Error';
      default:            return 'Checking...';
    }
  };

  const getCloudStatusClass = status => {
    switch (status) {
      case 'connected': return 'status-active';
      case 'available': return 'status-warning';
      default:          return 'status-inactive';
    }
  };

  const calculateSuccessRate = () => {
    const total = stats.stats.successful_recognitions + stats.stats.failed_recognitions;
    return total > 0
      ? Math.round((stats.stats.successful_recognitions / total) * 100)
      : 0;
  };

  const exportAttendance = () => {
    const csvContent =
      'Name,ID,Timestamp,Confidence\n' +
      attendance
        .map(e => `${e.name},${e.id},${e.timestamp},${e.confidence}`)
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <Navbar bg="primary" variant="dark" expand="lg">
        <Container fluid>
          <Navbar.Brand>
            <i className="fas fa-user-check me-2"></i>
            Smart Attendance System
          </Navbar.Brand>

        </Container>
      </Navbar>

      <Container fluid className="p-4">
        {error && (
          <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}



        {/* Statistics Overview */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="stat-card text-center">
              <Card.Body>
                <div className="stat-number">{stats.attendance_count}</div>
                <div className="stat-label">Total Attendance</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stat-card text-center">
              <Card.Body>
                <div className="stat-number">{stats.stats.faces_detected}</div>
                <div className="stat-label">Faces Detected</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stat-card text-center">
              <Card.Body>
                <div className="stat-number">{calculateSuccessRate()}%</div>
                <div className="stat-label">Recognition Rate</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stat-card text-center">
              <Card.Body>
                <div className="stat-number">{stats.stats.total_frames}</div>
                <div className="stat-label">Total Frames</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          {/* Camera Feed Section */}
          <Col lg={8}>
            <Card className="fade-in">
              <Card.Header>
                <h5><i className="fas fa-video me-2"></i>Live Face Recognition</h5>
                <small className="text-white-50">Real-time attendance monitoring</small>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="video-container">
                  {cameraStarted ? (
                    /* Simulated camera feed with animated overlay */
                    <div className="demo-camera-feed">
                      <div className="demo-camera-inner">
                        <div className="scan-line"></div>
                        <div className="face-box">
                          <div className="face-corner tl"></div>
                          <div className="face-corner tr"></div>
                          <div className="face-corner bl"></div>
                          <div className="face-corner br"></div>
                          <div className="face-label">
                            {DEMO_STUDENTS[studentIndexRef.current % DEMO_STUDENTS.length].name}
                            <span className="conf-badge">
                              {(DEMO_STUDENTS[studentIndexRef.current % DEMO_STUDENTS.length].baseConf * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="camera-overlay-info">
                          <span><i className="fas fa-circle text-danger me-1" style={{fontSize:'0.6rem'}}></i> LIVE</span>
                          <span>Frame: {stats.stats.total_frames}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-data-state">
                      <i className="fas fa-video-slash"></i>
                      <h4>Camera Not Started</h4>
                      <p>Click "Start Camera" to begin attendance monitoring</p>
                    </div>
                  )}
                </div>
              </Card.Body>
              <Card.Footer>
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    onClick={startCamera}
                    disabled={cameraStarted || loading}
                    className="flex-fill"
                  >
                    {loading
                      ? <><Spinner size="sm" className="me-2" />Starting...</>
                      : <><i className="fas fa-play me-2"></i>{cameraStarted ? 'Camera Active' : 'Start Camera'}</>
                    }
                  </Button>
                  <Button
                    variant="danger"
                    onClick={stopCamera}
                    disabled={!cameraStarted || loading}
                    className="flex-fill"
                  >
                    <i className="fas fa-stop me-2"></i>Stop
                  </Button>
                  <Button
                    variant="warning"
                    onClick={exportAttendance}
                    disabled={attendance.length === 0}
                  >
                    <i className="fas fa-download me-2"></i>Export
                  </Button>
                  <Button
                    variant="danger"
                    onClick={clearAttendance}
                    disabled={attendance.length === 0}
                  >
                    <i className="fas fa-trash me-2"></i>Clear
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          </Col>

          {/* Sidebar */}
          <Col lg={4}>
            {/* Cloud Status */}
            <Card className="cloud-status-card mb-3 fade-in">
              <Card.Header>
                <h6><i className="fas fa-cloud me-2"></i>Cloud Storage Status</h6>
              </Card.Header>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <div className={`status-indicator ${getCloudStatusClass(cloudStatus)} me-2`}></div>
                  <small>{getCloudStatusText(cloudStatus)}</small>
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    {cloudStatus === 'connected'
                      ? 'Auto-uploading attendance data'
                      : cloudStatus === 'available'
                      ? 'Check Azure configuration'
                      : 'Local storage only'}
                  </small>
                </div>
              </Card.Body>
            </Card>

            {/* System Statistics */}
            <Card className="mb-3 fade-in">
              <Card.Header>
                <h6><i className="fas fa-chart-bar me-2"></i>System Statistics</h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small>Recognition Rate</small>
                    <small>{calculateSuccessRate()}%</small>
                  </div>
                  <ProgressBar
                    now={calculateSuccessRate()}
                    variant={
                      calculateSuccessRate() > 80
                        ? 'success'
                        : calculateSuccessRate() > 60
                        ? 'warning'
                        : 'danger'
                    }
                    className="mb-3"
                  />
                </div>
                <div className="row text-center">
                  <div className="col-6">
                    <div className="h5 text-success">{stats.stats.successful_recognitions}</div>
                    <small className="text-muted">Successful</small>
                  </div>
                  <div className="col-6">
                    <div className="h5 text-danger">{stats.stats.failed_recognitions}</div>
                    <small className="text-muted">Failed</small>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Attendance Summary */}
            <Card className="fade-in">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h6><i className="fas fa-users me-2"></i>Today's Attendance</h6>
                <Badge bg="success">{attendance.length}</Badge>
              </Card.Header>
              <Card.Body>
                {attendance.length === 0 ? (
                  <div className="no-data-state">
                    <i className="fas fa-users"></i>
                    <h6>No Attendance Yet</h6>
                    <p>Waiting for students to be detected...</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {attendance.slice(0, 5).map((entry, index) => (
                      <div key={index} className="attendance-item" onClick={() => openModal(entry)}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-1">
                              <div className="status-indicator status-active me-2"></div>
                              <strong>{entry.name}</strong>
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                              <small className="text-muted">
                                <i className="fas fa-clock me-1"></i>
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </small>
                              <small className={
                                entry.confidence > 0.8
                                  ? 'text-success'
                                  : entry.confidence > 0.6
                                  ? 'text-warning'
                                  : 'text-danger'
                              }>
                                <i className="fas fa-bullseye me-1"></i>
                                {(entry.confidence * 100).toFixed(1)}%
                              </small>
                            </div>
                          </div>
                          <Badge bg="success">Present</Badge>
                        </div>
                      </div>
                    ))}
                    {attendance.length > 5 && (
                      <div className="text-center mt-2">
                        <small className="text-muted">+{attendance.length - 5} more entries</small>
                      </div>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Full Attendance Table */}
        {attendance.length > 0 && (
          <Row className="mt-4">
            <Col>
              <Card className="fade-in">
                <Card.Header>
                  <h5><i className="fas fa-list me-2"></i>Complete Attendance Log</h5>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table hover responsive>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>ID</th>
                        <th>Timestamp</th>
                        <th>Confidence</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((entry, index) => (
                        <tr key={index} onClick={() => openModal(entry)} style={{ cursor: 'pointer' }}>
                          <td>{index + 1}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="status-indicator status-active me-2"></div>
                              {entry.name}
                            </div>
                          </td>
                          <td><Badge bg="secondary">{entry.id}</Badge></td>
                          <td>{new Date(entry.timestamp).toLocaleString()}</td>
                          <td>
                            <span className={
                              entry.confidence > 0.8
                                ? 'text-success fw-bold'
                                : entry.confidence > 0.6
                                ? 'text-warning fw-bold'
                                : 'text-danger fw-bold'
                            }>
                              {(entry.confidence * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td><Badge bg="success">Present</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>

      {/* Student Detail Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user me-2"></i>Student Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEntry && (
            <div className="row">
              <div className="col-md-6">
                <h6>Basic Information</h6>
                <p><strong>Name:</strong> {selectedEntry.name}</p>
                <p><strong>ID:</strong> {selectedEntry.id}</p>
                <p><strong>Timestamp:</strong> {new Date(selectedEntry.timestamp).toLocaleString()}</p>
              </div>
              <div className="col-md-6">
                <h6>Recognition Details</h6>
                <p>
                  <strong>Confidence:</strong>
                  <span className={`ms-2 ${
                    selectedEntry.confidence > 0.8
                      ? 'text-success'
                      : selectedEntry.confidence > 0.6
                      ? 'text-warning'
                      : 'text-danger'
                  }`}>
                    {(selectedEntry.confidence * 100).toFixed(1)}%
                  </span>
                </p>
                <p><strong>Status:</strong> <Badge bg="success">Present</Badge></p>
                <div className="mt-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small>Recognition Quality</small>
                    <small>{(selectedEntry.confidence * 100).toFixed(1)}%</small>
                  </div>
                  <ProgressBar
                    now={selectedEntry.confidence * 100}
                    variant={
                      selectedEntry.confidence > 0.8
                        ? 'success'
                        : selectedEntry.confidence > 0.6
                        ? 'warning'
                        : 'danger'
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            <i className="fas fa-times me-2"></i>Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default App;
