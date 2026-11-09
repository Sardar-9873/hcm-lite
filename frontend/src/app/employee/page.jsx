'use client';

import { useEffect, useRef, useState } from 'react';
import API from '../../lib/api';
import SmartLeaveInput from '../../components/SmartLeaveInput';
import AIAssistantModal from '../../components/AIAssistantModal';

export default function EmployeeDashboard() {
  const [checkInState, setCheckInState] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [payslips, setPayslips] = useState([]);
  const [payslipsLoading, setPayslipsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animationRef = useRef(null);

  const faceCountRef = useRef(0);
  const lastDetectionRef = useRef(0);
  const lastDetectionTimeRef = useRef(0);

  // Camera initialization happens only after the modal is mounted.
  useEffect(() => {
    if (!cameraOpen) return;

    let cancelled = false;
    let stream = null;
    let detector = null;
    let rafId = null;

    const initializeCamera = async () => {
      try {
        setCameraLoading(true);
        setCameraError('');

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera is not supported by this browser.');
        }

        const video = videoRef.current;

        if (!video) {
          throw new Error('Camera video element is unavailable.');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;

        await video.play();
        setCameraLoading(false);

        const vision = await import('@mediapipe/tasks-vision');

        const fileset = await vision.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        );

        detector = await vision.FaceDetector.createFromOptions(
          fileset,
          {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
              delegate: 'CPU'
            },
            runningMode: 'VIDEO',
            minDetectionConfidence: 0.5
          }
        );

        if (cancelled) {
          detector.close();
          return;
        }

        detectorRef.current = detector;
        setCameraLoading(false);

        const detect = () => {
          if (cancelled) return;

          const currentVideo = videoRef.current;

          if (
            currentVideo &&
            currentVideo.readyState >= 2 &&
            detectorRef.current
          ) {
            const now = performance.now();

            if (now - lastDetectionRef.current >= 120) {
              lastDetectionRef.current = now;

              try {
                const result = detectorRef.current.detectForVideo(
                  currentVideo,
                  now
                );

                const count = result.detections?.length || 0;

                faceCountRef.current = count;
                lastDetectionTimeRef.current = now;

                setFaceCount(previous =>
                  previous === count ? previous : count
                );
              } catch (error) {
                console.error('Face detection error:', error);
                setCameraError('Face detection failed. Please restart camera.');
                return;
              }
            }
          }

          rafId = requestAnimationFrame(detect);
          animationRef.current = rafId;
        };

        detect();

      } catch (error) {
        console.error('Camera initialization error:', error);

        if (!cancelled) {
          setCameraError(
            error.message || 'Unable to initialize camera.'
          );
          setCameraLoading(false);
        }

        stream?.getTracks().forEach(track => track.stop());

        if (detector) detector.close();

        streamRef.current = null;
        detectorRef.current = null;
      }
    };

    initializeCamera();

    return () => {
      cancelled = true;

      if (rafId) cancelAnimationFrame(rafId);

      stream?.getTracks().forEach(track => track.stop());

      if (detector) detector.close();

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      streamRef.current = null;
      detectorRef.current = null;
      animationRef.current = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    const fetchMyPayslips = async () => {
      try {
        const res = await API.get('/payroll/my-payslips');
        setPayslips(res.data);
      } catch (error) {
        console.error('Fetch payslips error:', error);
      } finally {
        setPayslipsLoading(false);
      }
    };

    fetchMyPayslips();
  }, []);

  const startCamera = () => {
    faceCountRef.current = 0;
    lastDetectionRef.current = 0;
    lastDetectionTimeRef.current = 0;

    setFaceCount(0);
    setCameraError('');
    setCameraLoading(true);
    setCameraOpen(true);
  };

  const stopCamera = () => {
    setCameraOpen(false);
    setCameraLoading(false);
    setFaceCount(0);
    faceCountRef.current = 0;
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        error => {
          reject(
            new Error(
              error.code === 1
                ? 'Location permission denied.'
                : 'Unable to get your location.'
            )
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  };

  const handleCameraCheckIn = async () => {
    try {
      if (
        faceCountRef.current !== 1 ||
        performance.now() - lastDetectionTimeRef.current > 1500
      ) {
        alert('Please ensure exactly one face is visible in the camera.');
        return;
      }

      setCheckingIn(true);

      const location = await getCurrentLocation();

      const res = await API.post('/attendance/check-in', {
        source: 'camera',
        lat: location.lat,
        lng: location.lng
      });

      setCheckInState(res.data);
      stopCamera();

      alert('Camera face-presence check and GPS check-in successful!');

    } catch (error) {
      alert(
        error.response?.data?.error ||
        error.message ||
        'Camera check-in failed.'
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const handleWebCheckIn = async () => {
    try {
      const res = await API.post('/attendance/check-in', {
        source: 'web'
      });

      setCheckInState(res.data);
      alert('Checked in successfully via Web');

    } catch (error) {
      alert(
        error.response?.data?.error ||
        'Attendance check-in failed'
      );
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await API.post('/attendance/check-out');

      alert(`Checked out! Logged: ${res.data.workHours} hours`);

    } catch (error) {
      alert(
        error.response?.data?.error ||
        'Attendance check-out failed'
      );
    }
  };


  const handleDownloadPayslip = async (payslip) => {
    try {
      setDownloadingId(payslip._id);

      const res = await API.get(
        `/payroll/payslip/${payslip._id}/pdf`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'application/pdf' })
      );

      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${payslip.month}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      let message = 'Payslip download failed.';

      if (error.response?.data instanceof Blob) {
        const errorText = await error.response.data.text();

        try {
          message = JSON.parse(errorText).error || message;
        } catch {
          message = errorText || message;
        }
      }

      alert(message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        <header className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Employee Self-Service Portal
            </h1>

            <p className="text-xs text-gray-500">
              Log attendance, request leaves, and query policies
            </p>
          </div>
        </header>

        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleWebCheckIn}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg text-sm"
          >
            Web Check-In
          </button>

          <button
            onClick={startCamera}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg text-sm"
          >
            Camera Check-In
          </button>

          <button
            onClick={handleCheckOut}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 rounded-lg text-sm"
          >
            Check Out
          </button>
        </div>

        {checkInState && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="font-semibold text-emerald-800">
              Attendance recorded successfully!
            </p>

            <p className="text-sm text-emerald-700 mt-1">
              Status: {checkInState.status}
            </p>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              My Payslips
            </h2>
            <p className="text-sm text-gray-500">
              View and download your salary slips.
            </p>
          </div>

          {payslipsLoading ? (
            <p className="text-sm text-gray-500">
              Loading payslips...
            </p>
          ) : payslips.length === 0 ? (
            <p className="text-sm text-gray-500">
              No payslips available yet.
            </p>
          ) : (
            <div className="space-y-3">
              {payslips.map((payslip) => (
                <div
                  key={payslip._id}
                  className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {payslip.month}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      Gross: PKR {payslip.grossSalary.toLocaleString()}
                    </p>

                    <p className="text-sm font-medium text-emerald-700">
                      Net Salary: PKR {payslip.netSalary.toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDownloadPayslip(payslip)}
                    disabled={downloadingId === payslip._id}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    {downloadingId === payslip._id
                      ? 'Downloading...'
                      : 'Download PDF'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-lg space-y-4">

              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">
                  Camera Face Detection
                </h2>

                <button
                  onClick={stopCamera}
                  disabled={checkingIn}
                  className="text-gray-500 hover:text-red-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                    Initializing camera and face detector...
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-slate-100 p-4">
                <p className="text-sm font-semibold text-gray-700">
                  Face Detection Status
                </p>

                <p className="text-sm mt-2">
                  {cameraLoading
                    ? 'Loading detector...'
                    : faceCount === 0
                      ? 'No face detected. Please face the camera.'
                      : faceCount === 1
                        ? 'Exactly one face detected.'
                        : `${faceCount} faces detected. Only one person is allowed.`
                  }
                </p>

                <p className="text-xs text-gray-500 mt-2">
                  Detected faces: {faceCount}
                </p>
              </div>

              {cameraError && (
                <p className="text-sm text-red-600">
                  {cameraError}
                </p>
              )}

              <button
                onClick={handleCameraCheckIn}
                disabled={
                  cameraLoading ||
                  checkingIn ||
                  faceCount !== 1 ||
                  performance.now() - lastDetectionTimeRef.current > 1500
                }
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg"
              >
                {checkingIn
                  ? 'Verifying location...'
                  : 'Verify & Check In'
                }
              </button>

              <p className="text-xs text-gray-500 text-center">
                Face presence detection is performed in your browser.
                GPS office geofence is verified by the backend.
              </p>

            </div>
          </div>
        )}

        <SmartLeaveInput
          onApplied={() => console.log('Leave requested')}
        />

      </div>

      <AIAssistantModal />
    </div>
  );
}
