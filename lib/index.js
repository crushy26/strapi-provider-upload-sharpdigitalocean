'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const AWS = require('aws-sdk');
const Sharp = require('sharp');

module.exports = {
	provider: 'sharpdigitalocean',
	name: 'DigitaloceanSpace - Sharpresize ',
	auth: {
		key: {
			label: 'Key',
			type: 'text',
		},
		secret: {
			label: 'Secret',
			type: 'text',
		},
		region: {
			label: 'Region',
			type: 'enum',
			values: ['nyc3', 'sgp1', 'ams3', 'sfo2'],
		},
		space: {
			label: 'Space',
			type: 'text',
		},
	},
	init: config => {
		const S3 = new AWS.S3({
			accessKeyId: config.key,
			secretAccessKey: config.secret,
			sslEnabled: true,
			endpoint: `${config.region}.digitaloceanspaces.com`,
			params: {
				Bucket: config.space,
			},
		});

		return {
			upload: file => {
				if (file.ext == '.jpg' || file.ext == '.jpeg' || file.ext == '.png') {
					return new Promise((resolve, reject) => {
						Sharp(file.buffer)
							.toFormat('jpeg')
							.jpeg({ quality: 90, progressive: true })
							.resize(1000, null)
							.toBuffer()
							.then(buffer => {
								var params = {
									Key: `l_${file.hash}.jpeg`,
									Body: new Buffer(buffer, 'binary'),
									ACL: 'public-read',
									ContentType: 'image/jpeg',
								};

								S3.upload(params, (err, data) => {
									if (err) {
										return reject(err);
									}

									file.url = data.Location;

									file.cdn = data.Location.replace(
										'hog.sgp1.digitaloceanspaces.com',
										'cdn.whatsonnet.com'
									);

									file.relative = data.Location.pathname;

									//one more time
									Sharp(buffer)
										.toFormat('jpeg')
										.jpeg({ quality: 90, progressive: true })
										.resize(500, 500)
										.toBuffer()
										.then(buffer => {
											var params = {
												Key: `t_${file.hash}.jpeg`,
												Body: new Buffer(buffer, 'binary'),
												ACL: 'public-read',
												ContentType: 'image/jpeg',
											};

											S3.upload(params, (err, data) => {
												if (err) {
													return reject(err);
												}

												file.url = data.Location;

												file.cdn = data.Location.replace(
													'hog.sgp1.digitaloceanspaces.com',
													'cdn.whatsonnet.com'
												);

												file.relative = data.Location.pathname;
												resolve();
											});
										})
										.catch(err => reject(err));
								});
							})
							.catch(err => reject(err));
					});
				} else {
					return new Promise((resolve, reject) => {
						var params = {
							Key: `${file.hash}${file.ext}`,
							Body: new Buffer(file.buffer, 'binary'),
							ACL: 'public-read',
							ContentType: file.mime,
						};

						S3.upload(params, (err, data) => {
							if (err) {
								return reject(err);
							}

							file.url = data.Location;

							file.cdn = data.Location.replace('hog.sgp1.digitaloceanspaces.com', 'cdn.whatsonnet.com');

							file.relative = data.Location.pathname;
							resolve();
						});
					});
				}
			},
			delete: file => {
				return new Promise((resolve, reject) => {
					let bucket = config.space.split('/');
					let path = bucket.length > 1 ? bucket[1] + '/' : '';
					if (file.ext == '.jpg' || file.ext == '.jpeg' || file.ext == '.png') {
						S3.deleteObjects(
							{
								Bucket: bucket[0],
								Delete: {
									Objects: [
										{
											Key: `${path}t_${file.hash}.jpeg`,
										},
										{
											Key: `${path}l_${file.hash}.jpeg`,
										},
									],
								},
							},
							(err, data) => {
								if (err) {
									return reject(err);
								}
								resolve();
							}
						);
					} else {
						S3.deleteObject(
							{
								Bucket: bucket[0],
								Key: `${path}${file.hash}${file.ext}`,
							},
							(err, data) => {
								if (err) {
									return reject(err);
								}
								resolve();
							}
						);
					}
				});
			},
		};
	},
};
