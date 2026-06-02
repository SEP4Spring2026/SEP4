# Why we chose the Blattmann dataset



We looked at three external datasets to use alongside our own IoT data. The comparison was based on how similar their temperature and humidity distributions were to what our device actually reads, using Wasserstein distance as the measure.



**Environmental Sensor Telemetry** (kaggle.com/datasets/garystafford/environmental-sensor-data-132k)

* 132,000 rows, indoor IoT sensors
* Temperature was close to ours but humidity averaged around 68% — much higher than our device
* Main reason we didn't use it: no fire event labels at all, just ambient readings



**Algerian Forest Fires** (kaggle.com/datasets/nitinchoudhary012/algerian-forest-fires-dataset)

* Only 244 rows, collected outdoors in Algeria during summer
* Temperature averaged around 32°C, which is way off from our indoor readings
* Doesn't measure TVOC or eCO2, so the sensor type is completely different from ours



**Blattmann** (kaggle.com/datasets/deepcontractor/smoke-detection-dataset)

* 62,630 rows with labeled fire events (fire alarm = 0 or 1)
* Measures TVOC and eCO2 using a sensor comparable to our ENS160
* Humidity is shifted (\~48% vs our \~35%) but this is the only dataset that actually has fire labels and compatible features



We went with Blattmann not because it was the closest distribution match — it wasn't — but because it was the only option that had labeled fire events and the right sensor features. Without fire labels there's nothing to train the Fire class on, and that's the whole point of the model.
