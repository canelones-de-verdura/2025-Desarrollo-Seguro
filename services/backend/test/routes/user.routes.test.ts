// create a test for the auth routes
// using Jest and Supertest
import request from 'supertest';
import express from 'express';

import AuthService from '../../src/services/authService';
import userRoutes from '../../src/routes/user.routes';

jest.mock('../../src/services/authService');
const mockedAuthService = AuthService as jest.Mocked<typeof AuthService>;

const app = express();
app.use(express.json());
app.use('/users', userRoutes);

// sacado de
// https://stackoverflow.com/questions/53420562/mock-nodemailer-createtransport-sendmail-with-jest
const sendMailMock = jest.fn()

jest.mock("nodemailer")
import * as nodemailer from "nodemailer"
(nodemailer.createTransport as any).mockReturnValue({sendMail: sendMailMock});

describe('Auth Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('/ to create a new user', async () => {
        const newUser = {
            username: 'newuser',
            password: 'newpassword123',
            email: 'a@a.com',
            first_name: 'First',
            last_name: 'Last'
        };
        mockedAuthService.createUser.mockResolvedValue(newUser as any);
        const response = await request(app)
            .post('/users')
            .send(newUser);
        expect(response.status).toBe(201);
        expect(response.body).toEqual(newUser);
    });

    it('/ test template injection', async () => {
        // creamos user con la inyección que indicamos en el documento
        const username =  "<%= global.process.mainModule.require('child_process').execSync('ls').toString() %>"
        const newUser = {
            username: username,
            password: 'newpassword123',
            email: 'a@a.com2',
            first_name: 'First',
            last_name: 'Last'
        };
        mockedAuthService.createUser.mockResolvedValue(newUser as any);

        const response = await request(app)
            .post('/users')
            .send(newUser);
        expect(response.status).toBe(201);
        expect(response.body).toEqual(newUser);

        expect(sendMailMock).toHaveBeenCalledTimes(1);

        // obtenemos el parámetro que se le pasó a la función
        const email = (sendMailMock as any).mock.calls[0][0].html

        // si el html contiene el string textual, la inyección no funcionó
        expect(email).toContain(username)
    });

    it('/users to create a new user errors', async () => {
        mockedAuthService.createUser.mockRejectedValue(new Error('User already exists'));
        const response = await request(app)
            .post('/users')
            .send({
                username: 'existinguser',
                password: 'password123',
                email: 'a@a.com',
                first_name: 'First',
                last_name: 'Last'
            });
        expect(response.status).toBe(500);
    });

});
