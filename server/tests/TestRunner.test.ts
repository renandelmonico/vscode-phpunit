import { Filesystem } from '../src/Filesystem';
import { Process } from '../src/Process';
import { TestRunner } from '../src/TestRunner';

describe('TestRunner', () => {
    let process: Process;
    let files: Filesystem;
    let testRunner: TestRunner;

    beforeEach(async () => {
        process = new Process();
        files = new Filesystem();
        testRunner = new TestRunner(process, files);
    });

    describe('run', () => {
        beforeEach(() => {
            spyOn(process, 'run').and.returnValue('PHPUnit');
        });

        afterEach(() => {
            expect(testRunner.getOutput()).toEqual('PHPUnit');
        });

        describe('configuration', () => {
            beforeEach(() => {
                spyOn(files, 'findup').and.returnValues(
                    'phpunit',
                    'phpunit.xml'
                );
            });

            afterEach(() => {
                expect(files.findup).toHaveBeenCalledWith(
                    ['vendor/bin/phpunit', 'phpunit'],
                    undefined
                );
                expect(files.findup).toHaveBeenCalledWith(
                    ['phpunit.xml', 'phpunit.xml.dist'],
                    undefined
                );
            });

            it('run all', async () => {
                await testRunner.run();

                expect(process.run).toBeCalledWith(
                    {
                        title: 'PHPUnit LSP',
                        command: 'phpunit',
                        arguments: ['-c', 'phpunit.xml'],
                    },
                    undefined
                );
            });

            it('run file', async () => {
                const params = {
                    file: '/foo.php',
                };

                await testRunner.run(params);

                expect(process.run).toHaveBeenCalledWith(
                    {
                        title: 'PHPUnit LSP',
                        command: 'phpunit',
                        arguments: ['-c', 'phpunit.xml', params.file],
                    },
                    undefined
                );
            });

            it('rerun', async () => {
                const params = {
                    file: '/foo.php',
                };

                await testRunner.run(params);
                await testRunner.rerun({});

                expect(process.run).toHaveBeenCalledTimes(2);
                expect(process.run).toHaveBeenCalledWith(
                    {
                        title: 'PHPUnit LSP',
                        command: 'phpunit',
                        arguments: ['-c', 'phpunit.xml', params.file],
                    },
                    undefined
                );
            });

            it('run test', async () => {
                const params = {
                    file: '/foo.php',
                    method: 'test_passed',
                    depends: ['test_failed'],
                };

                await testRunner.run(params);

                expect(process.run).toHaveBeenCalledWith(
                    {
                        title: 'PHPUnit LSP',
                        command: 'phpunit',
                        arguments: [
                            '-c',
                            'phpunit.xml',
                            '--filter',
                            '/^.*::test_passed|test_failed.*$/',
                            params.file,
                        ],
                    },
                    undefined
                );
            });
        });

        it('custom php, phpunit, args', async () => {
            spyOn(files, 'findup').and.returnValues('phpunit.ini');

            testRunner
                .setPhpBinary('/php')
                .setPhpUnitBinary('/phpunit')
                .setArgs(['foo', 'bar']);

            await testRunner.run();

            expect(process.run).toHaveBeenCalledWith(
                {
                    title: 'PHPUnit LSP',
                    command: '/php',
                    arguments: ['/phpunit', '-c', 'phpunit.ini', 'foo', 'bar'],
                },
                undefined
            );
        });
    });

    it('cancel', async () => {
        spyOn(process, 'kill');
        await testRunner.cancel();
        expect(process.kill).toBeCalled();
    });
});
