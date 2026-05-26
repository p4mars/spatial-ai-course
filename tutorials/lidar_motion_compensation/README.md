# LiDAR Motion Compensation Visualizer

This is a small tutorial for understanding LiDAR motion distortion and motion compensation.

Open the `index.html` locally or [Online website](https://lidar-motion-compensation-visulizat.vercel.app/) have fun!

![Web Demo](image.png)

## 1. Why LiDAR Scans Can Be Distorted

A rotating LiDAR does not capture the whole frame at one instant.

Instead, it sends out laser rays one by one while the sensor is rotating:

![Visualization of lidar distortion, by Autoware Universe Documentation](image-1.png)

```text
ray 1   -> measured at t0
ray 2   -> measured slightly later
ray 3   -> measured slightly later
...
ray 360 -> measured at the end of the scan
```

If the robot is standing still, this is fine. All points are measured from the same robot pose.

But if the robot is moving while the LiDAR is scanning, different points in the same LiDAR frame are measured from different robot poses. If we ignore this and pretend all points were captured at the start pose, the final point cloud becomes distorted.

This is why motion compensation is needed.

## 2. What This Web Demo Does

This demo simulates a robot moving inside a 2D scene while taking one full LiDAR scan.

You can control:

- the robot linear velocity
- the robot angular velocity
- the total number of LiDAR rays
- the scan duration for one full LiDAR frame
- the IMU/odometry error level

During the scan, the robot moves and fires LiDAR rays one by one. The raw LiDAR frame is built in real time.

Try changing the speed, angular velocity, scan time, and ray count. Then compare the raw LiDAR frame with the motion compensated frame.

Open the demo:

```text
index.html
```

## 3. How Motion Compensation Works

The basic idea is simple: during one scan, the LiDAR is moving, so different points are measured from different LiDAR poses.

For each LiDAR point, we need two poses from odom/IMU:

```text
T_start = LiDAR pose when the scan starts
T_i     = LiDAR pose when point i is measured
```

The LiDAR receives point `i` in the local LiDAR coordinate frame at that moment:

```math
\mathbf{p}_i^{L_i}
=
\begin{bmatrix}
x_i \\
y_i \\
1
\end{bmatrix}
```

But we want to express this point in the LiDAR coordinate frame at the start of the scan, `L_start`.

So we compute the relative transformation from the point's measurement pose back to the scan-start pose:

```math
T_{start \leftarrow i}
=
T_{start}^{-1} T_i
```

Then motion compensation is just one matrix multiplication:

```math
\boxed{
\mathbf{p}_i^{L_{start}}
=
T_{start \leftarrow i}\,\mathbf{p}_i^{L_i}
}
```

Or written in one line:

```math
\boxed{
\mathbf{p}_i^{L_{start}}
=
T_{start}^{-1} T_i\,\mathbf{p}_i^{L_i}
}
```

That is the whole idea:

```text
point measured in LiDAR frame at time i
        +
relative transform from time i back to scan start
        ↓
same point expressed in scan-start LiDAR frame
```

Without motion compensation, we skip this transform and pretend every point was measured at the start pose. That is why the raw frame becomes distorted when the robot moves during the scan.

In this demo:

- the red frame is the raw LiDAR frame without motion compensation
- the blue frame is the motion compensated frame
- both frames use the scan start pose as the coordinate origin

## 4. IMU/Odom Error

Motion compensation depends on the quality of the pose estimate.

In real systems, IMU and odometry are not perfect. They can contain:

- IMU noise
- IMU bias
- wheel slip
- time synchronization error
- calibration error between LiDAR and IMU
- inaccurate velocity estimation

Because of this, motion compensation may not be perfect.

This demo includes an `IMU/Odom error` slider from `0%` to `50%`.

At `0%`, the compensation uses perfect pose estimates.

As the error increases, random pose error is added to the simulated IMU/odom estimate. You can see how bad pose estimation affects the final motion compensated LiDAR frame.

## 5. More Advanced Methods

Classical motion compensation usually depends on IMU/odom data.

More advanced methods can also use an existing map or reference point cloud. Instead of only trusting IMU/odom, they try to align the distorted LiDAR scan with a map and estimate the motion correction from that matching process.

One example is VICET:

https://github.com/mcdermatt/VICET

VICET uses a reference point cloud or HD map and tries to match the current distorted LiDAR scan to it. During this matching, it estimates both:

- the rigid pose of the scan relative to the map
- the motion distortion correction inside the scan

So this demo explains the basic intuition first: a LiDAR frame is built ray by ray while the robot moves. VICET and similar methods go further by using map matching to estimate or improve the motion correction.
