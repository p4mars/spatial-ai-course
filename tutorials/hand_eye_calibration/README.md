# Hand-in-Eye Calibration

This repository contains a Jupyter notebook that estimates the transformation between a gripper-mounted camera and the robot end-effector (eye-in-hand calibration), using a KINOVA Gen3 robot as an example. The same approach can be adapted to other platforms such as MIRTE.

## Contents

- `hand_in_eye_calibration.ipynb` — main notebook walking through the full calibration pipeline
- `calibrationData/` — images captured from the gripper camera across 30 different robot poses
- `intrinsic_params.json` — camera intrinsic parameters (focal length, principal point, distortion coefficients)
- `jointPositions.json` — recorded joint encoder positions corresponding to each calibration image
- `collecting_dataset.png` — example image from the calibration dataset

## What the notebook covers

1. Loading camera intrinsic parameters
2. Collecting and loading calibration images and joint positions
3. Estimating the extrinsic parameters for each pose using `solvePnP`
4. Computing forward kinematics to obtain gripper poses
5. Solving the hand-eye calibration equation using `cv2.calibrateHandEye`
6. Visualizing the calibration result with coordinate frames and a cube marker

## Requirements

```
opencv-python
numpy
Pillow
matplotlib
roboticstoolbox-python
```
